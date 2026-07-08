import type { DelegatedAccess } from "@listen/server";
import {
  MIGRATION_NAMESPACE,
  SCHEMA_STATEMENTS,
  COLUMN_MIGRATION_STATEMENTS,
  COLUMN_MIGRATION_ALREADY_APPLIED_STATEMENTS,
} from "@listen/core";
import { resolveAppPath } from "./manifest.js";

/** Database name for the conversations SQL store. */
export const DATABASE_NAME = resolveAppPath("conversations", "tinycloud.sql");

type ConversationSql = Pick<DelegatedAccess["sql"], "query" | "execute"> & {
  migrations: {
    apply(options: {
      namespace: string;
      migrations: Array<{ id: string; sql: string[] }>;
    }): Promise<{ ok: boolean; error?: { message?: string } }>;
  };
};

/**
 * Conversation data lives in its own TinyCloud SQL database. The SDK's
 * `access.sql.query/execute` shortcuts target the SDK default database
 * named "default", so backend routes must go through this helper.
 */
export function conversationSql(access: DelegatedAccess): ConversationSql {
  const sql = access.sql as DelegatedAccess["sql"] & {
    db?: (name: string) => ConversationSql;
  };

  const scoped = typeof sql.db === "function" ? sql.db(DATABASE_NAME) : sql;
  return withMigrationFallback(scoped);
}

function withMigrationFallback(sqlDb: unknown): ConversationSql {
  const candidate = sqlDb as Partial<Pick<DelegatedAccess["sql"], "query" | "execute">> & {
    migrations?: ConversationSql["migrations"];
  };
  if (candidate.migrations?.apply) return candidate as ConversationSql;
  const execute: ConversationSql["execute"] =
    typeof candidate.execute === "function"
      ? candidate.execute.bind(candidate)
      : async () => ({
          ok: false as const,
          error: {
            code: "SQL_EXECUTE_UNAVAILABLE",
            message: "SQL execute is unavailable on this access handle",
          } as any,
        });

  return {
    query: candidate.query!.bind(candidate),
    execute,
    migrations: {
      apply: async (options) => {
        for (const migration of options.migrations) {
          for (const sql of migration.sql) {
            const result = await execute(sql);
            if (!result.ok) return result;
          }
        }
        return { ok: true };
      },
    },
  };
}

function normalizeSchemaErrorMessage(message: string): string {
  if (
    /524\s*-/i.test(message) ||
    /Error code 524/i.test(message) ||
    /A timeout occurred/i.test(message) ||
    /<!doctype html/i.test(message) ||
    /<html[\s>]/i.test(message)
  ) {
    return "TinyCloud SQL timed out while preparing the conversations database. Please try again.";
  }

  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 500 ? `${compact.slice(0, 500)}...` : compact;
}

function schemaErrorMessage(result: unknown): string {
  const raw =
    (result as { error?: { message?: unknown; code?: unknown } } | null)?.error?.message ??
    (result as { error?: { message?: unknown; code?: unknown } } | null)?.error?.code ??
    "unknown error";

  return normalizeSchemaErrorMessage(String(raw));
}

function thrownSchemaErrorMessage(error: unknown): string {
  return normalizeSchemaErrorMessage(error instanceof Error ? error.message : String(error));
}

/**
 * Track schema initialization per DelegatedAccess instance.
 * WeakMap ensures cleanup when the access object is GC'd.
 */
const schemaInitialized = new WeakMap<object, boolean>();

/**
 * Ensure the conversations schema exists. Runs migrations at most once
 * per DelegatedAccess instance.
 */
export async function ensureSchema(access: DelegatedAccess): Promise<void> {
  if (schemaInitialized.has(access)) return;

  const sqlDb = conversationSql(access);
  const initialMigration = {
    namespace: MIGRATION_NAMESPACE,
    migrations: [
      {
        id: "001_initial",
        sql: SCHEMA_STATEMENTS,
      },
    ],
  };
  const created = await sqlDb.migrations.apply(initialMigration).catch((error) => ({
    ok: false as const,
    error: { message: thrownSchemaErrorMessage(error) },
  }));
  if (!created.ok) {
    const msg = schemaErrorMessage(created);
    throw new Error(`Failed to initialize conversations schema: ${msg}`);
  }

  const columnCheck = await sqlDb.query(
    "SELECT transcript_json, transcript_text FROM conversation LIMIT 1",
  );
  const columnMigration = {
    namespace: MIGRATION_NAMESPACE,
    migrations: [
      {
        id: "002_transcript_columns",
        sql: columnCheck.ok
          ? COLUMN_MIGRATION_ALREADY_APPLIED_STATEMENTS
          : COLUMN_MIGRATION_STATEMENTS,
      },
    ],
  };
  const updated = await sqlDb.migrations.apply(columnMigration).catch((error) => ({
    ok: false as const,
    error: { message: thrownSchemaErrorMessage(error) },
  }));
  if (!updated.ok) {
    const msg = schemaErrorMessage(updated);
    throw new Error(`Failed to update conversations schema: ${msg}`);
  }

  schemaInitialized.set(access, true);
}

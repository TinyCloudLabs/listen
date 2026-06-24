import type { DelegatedAccess } from "@listen/server";
import { conversationSql, ensureSchema } from "../schema.js";
import { OtterClient } from "./otter-client.js";
import type { OtterSpeech } from "./otter-client.js";
import { persistOtterSpeech } from "./otter-sync.js";

export interface OtterSyncProgress {
  phase: "listing" | "syncing";
  total?: number;
  current?: number;
  synced?: number;
  skipped?: number;
  failed?: number;
  lastTitle?: string;
}

export interface OtterSyncSummary {
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
  conversations: Array<{ id: string; title: string; started_at: string | null }>;
}

interface RunOptions {
  mode?: "incremental" | "full";
  shouldContinue?: () => boolean;
  onProgress?: (p: OtterSyncProgress) => void | Promise<void>;
}

type OtterApi = Pick<OtterClient, "listAllSpeeches" | "exportTxt">;

async function loadKnownOtterSourceIds(
  sqlDb: Pick<ReturnType<typeof conversationSql>, "query">,
): Promise<Set<string>> {
  const known = new Set<string>();
  const result = await sqlDb.query("SELECT source_id FROM conversation WHERE source = 'otter'");
  if (result.ok && result.data.rows) {
    for (const row of result.data.rows) {
      const val = Array.isArray(row) ? row[0] : (row as any).source_id;
      if (val) known.add(String(val));
    }
  }
  return known;
}

/**
 * Incremental Otter sync: list owned+shared speeches, skip already-imported
 * ones (by source_id), pull + persist the rest. Shared by the SSE route and
 * the automatic background scheduler.
 */
export async function runOtterSync(
  access: DelegatedAccess,
  client: OtterApi,
  options: RunOptions = {},
): Promise<OtterSyncSummary> {
  const { mode = "incremental", shouldContinue, onProgress } = options;
  await ensureSchema(access);
  const sqlDb = conversationSql(access);
  const known = mode === "incremental" ? await loadKnownOtterSourceIds(sqlDb) : new Set<string>();

  await onProgress?.({ phase: "listing" });
  const speeches = await client.listAllSpeeches();
  const fresh = speeches.filter((sp: OtterSpeech) => !known.has(`otter:${sp.otid}`));
  const skipped = speeches.length - fresh.length;

  const summary: OtterSyncSummary = {
    synced: 0,
    skipped,
    failed: 0,
    errors: [],
    conversations: [],
  };
  await onProgress?.({ phase: "syncing", total: fresh.length, current: 0, skipped });

  for (let i = 0; i < fresh.length; i += 1) {
    if (shouldContinue && !shouldContinue()) break;
    const sp = fresh[i]!;
    try {
      const txt = await client.exportTxt(sp.otid);
      const result = await persistOtterSpeech(sp, txt, access);
      if (result.status === "created") {
        summary.synced += 1;
        summary.conversations.push({
          id: result.conversationId!,
          title: result.title ?? sp.title ?? "",
          started_at: result.startedAt ?? null,
        });
      } else {
        summary.failed += 1;
        summary.errors.push(`${sp.otid}: ${result.error}`);
      }
    } catch (err) {
      summary.failed += 1;
      summary.errors.push(`${sp.otid}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await onProgress?.({
      phase: "syncing",
      total: fresh.length,
      current: i + 1,
      synced: summary.synced,
      skipped,
      failed: summary.failed,
      lastTitle: sp.title ?? sp.otid,
    });
  }

  return summary;
}

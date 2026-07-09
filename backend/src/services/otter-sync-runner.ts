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

interface KnownOtterConversation {
  id: string;
  updatedAt: string | null;
}

async function loadKnownOtterSourceIds(
  sqlDb: Pick<ReturnType<typeof conversationSql>, "query">,
): Promise<Map<string, KnownOtterConversation>> {
  const known = new Map<string, KnownOtterConversation>();
  const result = await sqlDb.query(
    "SELECT id, source_id, updated_at FROM conversation WHERE source = 'otter'",
  );
  if (result.ok && result.data.rows) {
    for (const row of result.data.rows) {
      const id = Array.isArray(row) ? row[0] : (row as any).id;
      const val = Array.isArray(row) ? row[1] : (row as any).source_id;
      const updatedAt = Array.isArray(row) ? row[2] : (row as any).updated_at;
      if (id && val) {
        known.set(String(val), {
          id: String(id),
          updatedAt: updatedAt == null ? null : String(updatedAt),
        });
      }
    }
  }
  return known;
}

function remoteSpeechUpdatedAt(sp: OtterSpeech): number | null {
  const raw = sp.transcript_updated_at ?? sp.modified_time;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return Number.isFinite(ms) ? ms : null;
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric > 1e12 ? numeric : numeric * 1000;

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function localUpdatedAt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function shouldSyncKnownOtterSpeech(sp: OtterSpeech, known: KnownOtterConversation): boolean {
  const remote = remoteSpeechUpdatedAt(sp);
  const local = localUpdatedAt(known.updatedAt);
  return remote != null && (local == null || remote > local);
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
  const known = await loadKnownOtterSourceIds(sqlDb);

  await onProgress?.({ phase: "listing" });
  const speeches = await client.listAllSpeeches();
  const fresh = speeches.filter((sp: OtterSpeech) => {
    if (mode === "full") return true;
    const existing = known.get(`otter:${sp.otid}`);
    return !existing || shouldSyncKnownOtterSpeech(sp, existing);
  });
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
      const result = await persistOtterSpeech(sp, txt, access, known.get(`otter:${sp.otid}`)?.id);
      if (result.status === "created" || result.status === "updated") {
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

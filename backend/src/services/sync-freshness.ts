import { resolveAppPath } from "../manifest.js";

export type SyncSource = "fireflies" | "granola" | "google-meet" | "soundcore" | "otter";

export interface BackendKV {
  get(key: string): Promise<{
    ok: boolean;
    data?: { data: string | null };
    error?: { code?: string; message?: string };
  }>;
  put(
    key: string,
    value: string,
  ): Promise<{
    ok: boolean;
    error?: { code?: string; message?: string };
  }>;
}

export type LastSyncState = Record<SyncSource, string | null>;

const SYNC_SOURCES: SyncSource[] = ["fireflies", "granola", "google-meet", "soundcore", "otter"];

function normalizeOwnerAddress(ownerAddress: string): string {
  return ownerAddress.toLowerCase();
}

function lastSyncKey(ownerAddress: string, source: SyncSource): string {
  return resolveAppPath(`sync/last-successful/${normalizeOwnerAddress(ownerAddress)}/${source}`);
}

export async function recordLastSuccessfulSync(
  backendKV: BackendKV | undefined,
  ownerAddress: string,
  source: SyncSource,
  at = new Date(),
): Promise<void> {
  if (!backendKV) return;
  const result = await backendKV.put(lastSyncKey(ownerAddress, source), at.toISOString());
  if (result.ok) return;

  const message = result.error?.message ?? result.error?.code ?? "backend KV write failed";
  throw new Error(`Failed to write last successful sync for ${source}: ${message}`);
}

export async function readLastSuccessfulSyncs(
  backendKV: Pick<BackendKV, "get"> | undefined,
  ownerAddress: string,
): Promise<LastSyncState> {
  const empty = Object.fromEntries(SYNC_SOURCES.map((source) => [source, null])) as LastSyncState;
  if (!backendKV) return empty;

  const entries = await Promise.all(
    SYNC_SOURCES.map(async (source) => {
      try {
        const result = await backendKV.get(lastSyncKey(ownerAddress, source));
        const value = result.ok ? (result.data?.data ?? null) : null;
        return [source, value] as const;
      } catch {
        return [source, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as LastSyncState;
}

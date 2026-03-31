// ── Normalized conversation types ───────────────────────────────────

export interface NormalizedConversation {
  conversation: {
    id: string; // generated unique ID
    title: string | null;
    source: string;
    source_id: string;
    source_url: string | null;
    started_at: string | null;
    ended_at: string | null;
    duration_secs: number | null;
    summary: string | null;
    metadata: Record<string, unknown>;
  };
  participants: Array<{
    id: string; // generated unique ID
    name: string;
    email: string | null;
    speaker_label: string | null;
  }>;
  transcript: unknown; // raw sentences array, stored as KV blob
}

export type NormalizeFn<T> = (raw: T) => NormalizedConversation;

const FIREFLIES_GRAPHQL_URL = "https://api.fireflies.ai/graphql";
const MAX_RETRIES = 3;
const DEFAULT_RATE_LIMIT_WAIT_MS = 60_000;

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Response types ──────────────────────────────────────────────────

export interface FirefliesUser {
  name: string;
  email: string;
  is_admin: boolean;
}

export interface TranscriptSummary {
  id: string;
  title: string;
  date: number;
  duration: number;
  organizer_email: string;
  transcript_url: string;
}

export interface Speaker {
  id: string;
  name: string;
}

export interface MeetingAttendee {
  displayName: string;
  email: string;
}

export interface AiFilters {
  task: boolean;
  pricing: boolean;
  metric: boolean;
  question: boolean;
  date_and_time: boolean;
  sentiment: string;
}

export interface Sentence {
  index: number;
  speaker_id: string;
  speaker_name: string;
  text: string;
  raw_text: string;
  start_time: number;
  end_time: number;
  ai_filters: AiFilters;
}

export interface TranscriptSummaryInfo {
  keywords: string[];
  action_items: string[];
  overview: string;
  shorthand_bullet: string;
  meeting_type: string;
}

export interface FullTranscript {
  id: string;
  title: string;
  date: number;
  duration: number;
  organizer_email: string;
  transcript_url: string;
  speakers: Speaker[];
  meeting_attendees: MeetingAttendee[];
  sentences: Sentence[];
  summary: TranscriptSummaryInfo;
  audio_url: string;
}

// ── GraphQL queries ─────────────────────────────────────────────────

const GET_USER_QUERY = `query GetUser {
  user {
    name
    email
    is_admin
  }
}`;

const LIST_TRANSCRIPTS_QUERY = `query ListTranscripts($limit: Int, $skip: Int) {
  transcripts(limit: $limit, skip: $skip) {
    id
    title
    date
    duration
    organizer_email
    transcript_url
  }
}`;

const GET_TRANSCRIPT_QUERY = `query GetTranscript($id: String!) {
  transcript(id: $id) {
    id
    title
    date
    duration
    organizer_email
    transcript_url
    speakers {
      id
      name
    }
    meeting_attendees {
      displayName
      email
    }
    sentences {
      index
      speaker_id
      speaker_name
      text
      raw_text
      start_time
      end_time
      ai_filters {
        task
        pricing
        metric
        question
        date_and_time
        sentiment
      }
    }
    summary {
      keywords
      action_items
      overview
      shorthand_bullet
      meeting_type
    }
    audio_url
  }
}`;

// ── Pagination types ────────────────────────────────────────────────

export interface PaginationOptions {
  /** Transcripts per API call (default 25, max 50). */
  batchSize?: number;
  /** "incremental" stops at already-known IDs; "full" fetches everything. */
  mode?: "incremental" | "full";
  /** Known transcript IDs for incremental early-exit. */
  knownIds?: Set<string>;
  /** Delay between API calls in ms (default 800). */
  delayMs?: number;
  /** Called after each batch with progress info. */
  onProgress?: (info: { batch: number; totalSoFar: number }) => void;
}

export interface PaginationResult {
  transcripts: TranscriptSummary[];
  batchCount: number;
  earlyExit: boolean;
}

// ── Client ──────────────────────────────────────────────────────────

export class FirefliesClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Fetch the authenticated user's info. */
  async getUser(): Promise<FirefliesUser> {
    return this.request<{ user: FirefliesUser }>(GET_USER_QUERY).then((data) => data.user);
  }

  /** List transcripts with optional pagination. */
  async listTranscripts(limit?: number, skip?: number): Promise<TranscriptSummary[]> {
    return this.request<{ transcripts: TranscriptSummary[] }>(LIST_TRANSCRIPTS_QUERY, {
      limit,
      skip,
    }).then((data) => data.transcripts);
  }

  /** Fetch a single transcript with full detail. */
  async getTranscript(id: string): Promise<FullTranscript> {
    return this.request<{ transcript: FullTranscript }>(GET_TRANSCRIPT_QUERY, { id }).then(
      (data) => data.transcript,
    );
  }

  /**
   * Paginate through all transcripts.
   *
   * In "incremental" mode (default), stops early when it encounters
   * transcripts already in `knownIds` — assumes newest-first API ordering.
   * In "full" mode, fetches every page until exhausted.
   */
  async listAllTranscripts(options?: PaginationOptions): Promise<PaginationResult> {
    const batchSize = Math.min(Math.max(options?.batchSize ?? 25, 1), 50);
    const mode = options?.mode ?? "incremental";
    const knownIds = options?.knownIds;
    const delayMs = options?.delayMs ?? 800;
    const onProgress = options?.onProgress;

    const all: TranscriptSummary[] = [];
    let skip = 0;
    let batchCount = 0;
    let earlyExit = false;

    while (true) {
      if (skip > 0) await sleep(delayMs);

      const page = await this.listTranscripts(batchSize, skip);
      batchCount++;

      // Incremental: stop when we hit already-known transcripts
      if (mode === "incremental" && knownIds) {
        const seenInBatch = page.some((t) => knownIds.has(t.id));
        if (seenInBatch) {
          for (const t of page) {
            if (!knownIds.has(t.id)) all.push(t);
          }
          earlyExit = true;
          onProgress?.({ batch: batchCount, totalSoFar: all.length });
          break;
        }
      }

      all.push(...page);
      onProgress?.({ batch: batchCount, totalSoFar: all.length });

      if (page.length < batchSize) break; // last page
      skip += batchSize;
    }

    return { transcripts: all, batchCount, earlyExit };
  }

  // ── Private ───────────────────────────────────────────────────

  private async request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(FIREFLIES_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      // Handle HTTP 429
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : DEFAULT_RATE_LIMIT_WAIT_MS;
        console.log(
          `[fireflies] Rate limited (429). Waiting ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`,
        );
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Fireflies API error: ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as {
        data?: T;
        errors?: Array<{ message: string; code?: string }>;
      };

      // Handle GraphQL-level rate limits
      if (json.errors?.length) {
        const rateLimited = json.errors.find((e) => e.code === "too_many_requests");
        if (rateLimited && attempt < MAX_RETRIES) {
          const match = rateLimited.message?.match(/retry after (.+?)(\s*\(|$)/i);
          const waitUntil = match ? new Date(match[1]) : null;
          const waitMs = waitUntil
            ? Math.max(waitUntil.getTime() - Date.now(), 0)
            : DEFAULT_RATE_LIMIT_WAIT_MS;
          console.log(
            `[fireflies] Rate limited (GraphQL). Waiting ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`,
          );
          await sleep(waitMs);
          continue;
        }
        throw new Error(json.errors[0].message);
      }

      return json.data as T;
    }

    throw new Error("Fireflies API: max retries exceeded");
  }
}

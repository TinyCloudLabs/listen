import { createHash } from "node:crypto";

const SOUNDCORE_API_URL = "https://anka-api-us.soundcore.com";

export interface SoundcoreCredentials {
  authToken: string;
  uid: string;
  openudid: string;
}

export interface SoundcoreNoteSummary {
  note_id: string;
  note_title: string;
  audio_duration: number;
  updated_at: number | string;
  app_note_id: number;
  is_trans: boolean;
  is_summary: boolean;
}

export interface SoundcoreTranscriptSegment {
  start_time: number;
  end_time: number;
  speaker: string;
  content: string;
}

export interface SoundcoreNoteAiSummary {
  content: string;
  one_page_summary?: string;
}

export interface SoundcoreNote extends SoundcoreNoteSummary {
  transcript: SoundcoreTranscriptSegment[];
  summary: SoundcoreNoteAiSummary | null;
}

export interface SoundcoreListOptions {
  pageSize?: number;
}

export class SoundcoreAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoundcoreAuthError";
  }
}

export class SoundcoreApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SoundcoreApiError";
  }
}

const AUTH_ERROR_CODES = new Set([401, 10000, 10001, 10003, 99999]);

function gtokenFromUid(uid: string): string {
  return createHash("md5").update(uid).digest("hex");
}

function buildHeaders(creds: SoundcoreCredentials): Record<string, string> {
  return {
    "App-name": "soundcore_app",
    "X-Aiot-Auth": "soundcore",
    Accept: "*/*",
    "Content-Type": "application/json",
    "Model-type": "WEB",
    Language: "en",
    Openudid: creds.openudid,
    "X-Auth-Token": creds.authToken,
    Token: creds.authToken,
    Uid: creds.uid,
    "Anker-X-User-Id": creds.uid,
    gtoken: gtokenFromUid(creds.uid),
  };
}

export class SoundcoreClient {
  constructor(
    private readonly credentials: SoundcoreCredentials,
    private readonly baseUrl = SOUNDCORE_API_URL,
  ) {}

  async listNotes(options: SoundcoreListOptions = {}): Promise<SoundcoreNoteSummary[]> {
    const all: SoundcoreNoteSummary[] = [];
    let page = 1;
    const pageSize = Math.min(Math.max(options.pageSize ?? 50, 1), 100);

    for (let guard = 0; guard < 100; guard += 1) {
      const data = await this.post<any>("/app/audio/note/list", {
        page,
        page_size: pageSize,
        sort_by: "app_note_id",
        order: "desc",
        is_recycled: false,
      });

      const items: any[] =
        data?.items ?? data?.list ?? data?.notes ?? (Array.isArray(data) ? data : null);

      if (!Array.isArray(items) || items.length === 0) break;
      all.push(...items.map(normalizeNoteSummary));

      const total = typeof data?.total === "number" ? data.total : undefined;
      const hasMore = typeof data?.has_more === "boolean" ? data.has_more : undefined;
      if (hasMore === false) break;
      if (total !== undefined && all.length >= total) break;
      if (items.length < pageSize) break;
      page += 1;
    }

    return all;
  }

  async getNote(summary: SoundcoreNoteSummary): Promise<SoundcoreNote> {
    const [transcript, aiSummary] = await Promise.all([
      summary.is_trans ? this.queryTranscript(summary.note_id) : Promise.resolve([]),
      summary.is_summary ? this.querySummary(summary.note_id) : Promise.resolve(null),
    ]);

    return { ...summary, transcript, summary: aiSummary };
  }

  private async queryTranscript(noteId: string): Promise<SoundcoreTranscriptSegment[]> {
    const data = await this.post<any>("/app/audio/note/query_trans", { note_id: noteId });
    const segments: any[] =
      data?.segments ?? data?.trans ?? data?.list ?? (Array.isArray(data) ? data : null);
    if (!Array.isArray(segments)) return [];

    return segments.map((segment) => ({
      start_time: Number(segment?.start_time ?? segment?.start ?? 0),
      end_time: Number(segment?.end_time ?? segment?.end ?? 0),
      speaker: String(segment?.speaker ?? segment?.speaker_name ?? segment?.role ?? "Speaker"),
      content: String(segment?.content ?? segment?.text ?? ""),
    }));
  }

  private async querySummary(noteId: string): Promise<SoundcoreNoteAiSummary | null> {
    try {
      const data = await this.post<any>("/app/audio/note/query_summary", { note_id: noteId });
      const content = typeof data?.content === "string" ? data.content : data?.summary;
      const onePage =
        typeof data?.one_page_summary === "string" ? data.one_page_summary : data?.onePageSummary;
      if (typeof content !== "string" && typeof onePage !== "string") return null;
      return {
        content: typeof content === "string" ? content : "",
        ...(typeof onePage === "string" ? { one_page_summary: onePage } : {}),
      };
    } catch {
      return null;
    }
  }

  private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: buildHeaders(this.credentials),
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Network error calling Soundcore ${endpoint}: ${errorMessage(err)}`);
    }

    if (response.status === 401) {
      throw new SoundcoreAuthError("Soundcore rejected the stored credentials.");
    }

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new SoundcoreApiError(
        response.status,
        `Soundcore returned non-JSON response from ${endpoint}: ${text.slice(0, 300)}`,
      );
    }

    if (json?.code === 0) return json.data as T;

    const code = json?.code;
    const msg = json?.msg ?? json?.message ?? response.statusText ?? "Soundcore API request failed";
    if (typeof code === "number" && AUTH_ERROR_CODES.has(code)) {
      throw new SoundcoreAuthError(`Soundcore auth failed (${code}: ${msg}).`);
    }

    throw new SoundcoreApiError(response.status, `Soundcore API error on ${endpoint}: ${msg}`);
  }
}

function normalizeNoteSummary(raw: any): SoundcoreNoteSummary {
  return {
    note_id: String(raw?.note_id ?? raw?.id ?? ""),
    note_title: String(raw?.note_title ?? raw?.title ?? raw?.name ?? "Untitled"),
    audio_duration: Number(raw?.audio_duration ?? raw?.duration ?? 0),
    updated_at: raw?.updated_at ?? raw?.updatedAt ?? 0,
    app_note_id: Number(raw?.app_note_id ?? raw?.create_time ?? raw?.created_at ?? 0),
    is_trans: Boolean(raw?.is_trans ?? raw?.has_trans ?? false),
    is_summary: Boolean(raw?.is_summary ?? raw?.has_summary ?? false),
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

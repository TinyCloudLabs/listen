const GRANOLA_API_URL = "https://public-api.granola.ai/v1";

export interface GranolaPerson {
  name?: string | null;
  email?: string | null;
}

export interface GranolaCalendarEvent {
  event_title?: string | null;
  organiser?: string | null;
  calendar_event_id?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  invitees?: Array<{ email?: string | null }>;
}

export interface GranolaTranscriptItem {
  speaker?: {
    source?: string | null;
    diarization_label?: string | null;
  } | null;
  text: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface GranolaNoteSummary {
  id: string;
  object?: "note";
  title: string | null;
  owner?: GranolaPerson | null;
  created_at: string;
  updated_at: string;
}

export interface GranolaNote extends GranolaNoteSummary {
  web_url: string | null;
  calendar_event?: GranolaCalendarEvent | null;
  attendees?: GranolaPerson[];
  folder_membership?: Array<{
    id: string;
    object?: "folder";
    name?: string | null;
    parent_folder_id?: string | null;
  }>;
  summary_text?: string | null;
  summary_markdown?: string | null;
  transcript?: GranolaTranscriptItem[] | null;
}

interface ListNotesResponse {
  notes: GranolaNoteSummary[];
  hasMore: boolean;
  cursor: string | null;
}

export interface GranolaListOptions {
  pageSize?: number;
  cursor?: string;
}

export interface GranolaPaginationOptions {
  pageSize?: number;
  mode?: "incremental" | "full";
  knownIds?: Set<string>;
  onProgress?: (info: { page: number; totalSoFar: number }) => void;
}

export interface GranolaPaginationResult {
  notes: GranolaNoteSummary[];
  pageCount: number;
  earlyExit: boolean;
}

export class GranolaApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GranolaApiError";
    this.status = status;
  }
}

export class GranolaClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = GRANOLA_API_URL,
  ) {}

  async listNotes(options: GranolaListOptions = {}): Promise<ListNotesResponse> {
    const params = new URLSearchParams();
    params.set("page_size", String(Math.min(Math.max(options.pageSize ?? 10, 1), 30)));
    if (options.cursor) params.set("cursor", options.cursor);

    return this.request<ListNotesResponse>(`/notes?${params.toString()}`);
  }

  async listAllNotes(options: GranolaPaginationOptions = {}): Promise<GranolaPaginationResult> {
    const pageSize = Math.min(Math.max(options.pageSize ?? 30, 1), 30);
    const mode = options.mode ?? "incremental";
    const knownIds = options.knownIds;
    const notes: GranolaNoteSummary[] = [];
    let pageCount = 0;
    let cursor: string | undefined;
    let earlyExit = false;

    do {
      const page = await this.listNotes({ pageSize, cursor });
      pageCount++;

      const pageKnownCount = knownIds
        ? page.notes.filter((note) => knownIds.has(note.id)).length
        : 0;
      if (
        mode === "incremental" &&
        knownIds &&
        page.notes.length > 0 &&
        pageKnownCount === page.notes.length
      ) {
        // Granola returns notes newest-first; a whole known page means older pages were seen too.
        earlyExit = true;
        options.onProgress?.({ page: pageCount, totalSoFar: notes.length });
        break;
      }

      notes.push(
        ...(mode === "incremental" && knownIds
          ? page.notes.filter((note) => !knownIds.has(note.id))
          : page.notes),
      );
      options.onProgress?.({ page: pageCount, totalSoFar: notes.length });
      cursor = page.cursor ?? undefined;
      if (!page.hasMore) break;
    } while (cursor);

    return { notes, pageCount, earlyExit };
  }

  async getNote(noteId: string): Promise<GranolaNote> {
    return this.request<GranolaNote>(`/notes/${encodeURIComponent(noteId)}?include=transcript`);
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const message = text || response.statusText || "Granola API request failed";
      throw new GranolaApiError(
        response.status,
        `Granola API error: ${response.status} ${message}`,
      );
    }

    return (await response.json()) as T;
  }
}

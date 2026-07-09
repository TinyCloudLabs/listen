import { refreshAccessToken } from "./google-auth.js";

// ── Constants ───────────────────────────────────────────────────────

const BASE_URL = "https://meet.googleapis.com/v2";
const DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_DOC_TEXT_MIME_TYPE = "text/plain";
const MAX_CONFERENCES = 500;
const MAX_ENTRIES_PER_TRANSCRIPT = 1000;
const MAX_429_RETRIES = 3;

// ── Types ───────────────────────────────────────────────────────────

export interface ConferenceRecord {
  name: string;
  startTime: string;
  endTime?: string;
  expireTime: string;
  space: string;
}

export type ConferenceRecordList = ConferenceRecord[] & {
  truncated?: boolean;
  cap?: number;
};

export interface Participant {
  name: string;
  earliestStartTime: string;
  latestEndTime?: string;
  signedinUser?: { user: string; displayName: string };
  anonymousUser?: { displayName: string };
  phoneUser?: { displayName: string };
}

export interface Transcript {
  name: string;
  state: "STATE_UNSPECIFIED" | "STARTED" | "ENDED" | "FILE_GENERATED";
  startTime: string;
  endTime?: string;
  docsDestination?: {
    document: string;
    exportUri: string;
  };
}

export interface TranscriptEntry {
  name: string;
  participant: string;
  text: string;
  languageCode: string;
  startTime: string;
  endTime: string;
}

export interface FullConference {
  conferenceRecord: ConferenceRecord;
  participants: Participant[];
  transcripts: Transcript[];
  entries: TranscriptEntry[];
}

// ── Client ──────────────────────────────────────────────────────────

export class GoogleMeetClient {
  private accessToken: string;
  private refreshToken?: string;
  private onTokenRefresh?: (newToken: string) => Promise<void>;

  constructor(
    accessToken: string,
    onTokenRefresh?: (newToken: string) => Promise<void>,
    refreshToken?: string,
  ) {
    this.accessToken = accessToken;
    this.onTokenRefresh = onTokenRefresh;
    this.refreshToken = refreshToken;
  }

  async listConferenceRecords(sinceDays = 30): Promise<ConferenceRecordList> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    const filter = `start_time>="${since.toISOString()}"`;

    return this.paginate<ConferenceRecord>(
      `${BASE_URL}/conferenceRecords`,
      "conferenceRecords",
      { filter, pageSize: "100" },
      MAX_CONFERENCES,
    );
  }

  async listParticipants(conferenceRecordName: string): Promise<Participant[]> {
    return this.paginate<Participant>(
      `${BASE_URL}/${conferenceRecordName}/participants`,
      "participants",
      { pageSize: "250" },
    );
  }

  async listTranscripts(conferenceRecordName: string): Promise<Transcript[]> {
    return this.paginate<Transcript>(
      `${BASE_URL}/${conferenceRecordName}/transcripts`,
      "transcripts",
      {},
    );
  }

  async listTranscriptEntries(transcriptName: string): Promise<TranscriptEntry[]> {
    return this.paginate<TranscriptEntry>(
      `${BASE_URL}/${transcriptName}/entries`,
      "transcriptEntries",
      { pageSize: "100" },
      MAX_ENTRIES_PER_TRANSCRIPT,
    );
  }

  async getConferenceRecord(name: string): Promise<ConferenceRecord> {
    return this.fetchWithRetry(`${BASE_URL}/${name}`) as Promise<ConferenceRecord>;
  }

  async getFullConference(conferenceRecord: ConferenceRecord): Promise<FullConference> {
    const [participants, transcripts] = await Promise.all([
      this.listParticipants(conferenceRecord.name),
      this.listTranscripts(conferenceRecord.name),
    ]);

    const entries: TranscriptEntry[] = [];
    for (const transcript of transcripts) {
      const transcriptEntries = await this.listTranscriptEntries(transcript.name);
      if (transcriptEntries.length > 0) {
        entries.push(...transcriptEntries);
        continue;
      }

      const fallbackEntries = await this.exportTranscriptDocEntries(transcript);
      entries.push(...fallbackEntries);
    }

    return { conferenceRecord, participants, transcripts, entries };
  }

  // ── Internals ───────────────────────────────────────────────────

  private async paginate<T>(
    baseUrl: string,
    resultKey: string,
    params: Record<string, string>,
    cap?: number,
  ): Promise<T[] & { truncated?: boolean; cap?: number }> {
    const results = [] as T[] & { truncated?: boolean; cap?: number };
    let pageToken: string | undefined;

    do {
      const url = new URL(baseUrl);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const data = await this.fetchWithRetry(url.toString());
      const items = (data[resultKey] ?? []) as T[];
      results.push(...items);

      if (cap && results.length >= cap) {
        const capped = results.slice(0, cap) as T[] & { truncated?: boolean; cap?: number };
        capped.truncated = true;
        capped.cap = cap;
        return capped;
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return results;
  }

  private async exportTranscriptDocEntries(transcript: Transcript): Promise<TranscriptEntry[]> {
    const fileId = transcriptDocFileId(transcript);
    if (!fileId) return [];

    const url = new URL(`${DRIVE_BASE_URL}/files/${encodeURIComponent(fileId)}/export`);
    url.searchParams.set("mimeType", DRIVE_DOC_TEXT_MIME_TYPE);

    const text = await this.fetchTextWithRetry(url.toString());
    return transcriptTextToEntries(transcript, text);
  }

  private async fetchTextWithRetry(
    url: string,
    retryCount = 0,
    hasRefreshed = false,
  ): Promise<string> {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (res.status === 401 && !hasRefreshed) {
      if (!this.onTokenRefresh) {
        throw new Error("Google API returned 401 and no token refresh handler configured");
      }
      const tokenData = await refreshAccessToken(this.refreshToken ?? "");
      this.accessToken = tokenData.access_token;
      await this.onTokenRefresh(tokenData.access_token);
      return this.fetchTextWithRetry(url, 0, true);
    }

    if (res.status === 429 && retryCount < MAX_429_RETRIES) {
      const delay = Math.pow(2, retryCount) * 100;
      await new Promise((r) => setTimeout(r, delay));
      return this.fetchTextWithRetry(url, retryCount + 1, hasRefreshed);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Google Drive transcript export failed: ${res.status} ${res.statusText}${
          body ? ` ${body}` : ""
        }`,
      );
    }

    return res.text();
  }

  private async fetchWithRetry(url: string, retryCount = 0, hasRefreshed = false): Promise<any> {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    // 401 — attempt token refresh once
    if (res.status === 401 && !hasRefreshed) {
      if (!this.onTokenRefresh) {
        throw new Error("Google Meet API returned 401 and no token refresh handler configured");
      }
      const tokenData = await refreshAccessToken(this.refreshToken ?? "");
      this.accessToken = tokenData.access_token;
      await this.onTokenRefresh(tokenData.access_token);
      return this.fetchWithRetry(url, 0, true);
    }

    // 429 — exponential backoff
    if (res.status === 429 && retryCount < MAX_429_RETRIES) {
      const delay = Math.pow(2, retryCount) * 100;
      await new Promise((r) => setTimeout(r, delay));
      return this.fetchWithRetry(url, retryCount + 1, hasRefreshed);
    }

    if (!res.ok) {
      throw new Error(`Google Meet API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

function transcriptDocFileId(transcript: Transcript): string | null {
  const raw = transcript.docsDestination?.document || transcript.docsDestination?.exportUri;
  if (!raw) return null;

  const docUrlMatch = raw.match(/\/document\/d\/([^/?#]+)/);
  if (docUrlMatch?.[1]) return docUrlMatch[1];

  const fileUrlMatch = raw.match(/\/file\/d\/([^/?#]+)/);
  if (fileUrlMatch?.[1]) return fileUrlMatch[1];

  return raw.split("/").filter(Boolean).pop() ?? null;
}

function transcriptTextToEntries(transcript: Transcript, text: string): TranscriptEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const startTime = transcript.startTime;
  const endTime = transcript.endTime ?? transcript.startTime;

  return lines.map((line, index) => ({
    name: `${transcript.name}/entries/drive-doc-${index + 1}`,
    participant: "",
    text: line,
    languageCode: "und",
    startTime,
    endTime,
  }));
}

import { unzipSync } from "fflate";
import type { OtterCookie } from "./cookie.ts";

export interface OtterSpeech {
  otid: string;
  title?: string | null;
  start_time?: number | null;
  created_at?: number | null;
  duration?: number | null;
  transcript_updated_at?: number | string | null;
  modified_time?: number | string | null;
  hasPhotos?: number | null;
  live_status?: string | null;
}

const RETRY_WAITS_MS = [1000, 3000, 8000];

export class OtterClient {
  readonly base: string;
  private readonly cookie: OtterCookie;
  private uid: string | null = null;

  constructor(base: string, cookie: OtterCookie) {
    this.base = base.endsWith("/") ? base : `${base}/`;
    this.cookie = cookie;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      cookie: `sessionid=${this.cookie.sessionid}; csrftoken=${this.cookie.csrftoken}`,
      referer: "https://otter.ai/",
      "user-agent": "Mozilla/5.0",
      ...extra,
    };
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (attempt >= RETRY_WAITS_MS.length || (res.status < 500 && res.status !== 429)) {
        throw new Error(`${init.method ?? "GET"} ${url} -> ${res.status} ${res.statusText}`);
      }
      await Bun.sleep(RETRY_WAITS_MS[attempt]!);
    }
  }

  /** GET /user — validates the cookie and returns the account; throws if the cookie is dead. */
  async user(): Promise<Record<string, unknown>> {
    const res = await this.request(`${this.base}user`, { headers: this.headers() });
    const json = (await res.json()) as Record<string, unknown>;
    const userid = json.userid;
    if (typeof userid !== "string" && typeof userid !== "number") {
      throw new Error("Otter /user returned no userid — cookie is invalid or expired.");
    }
    this.uid = String(userid);
    return json;
  }

  private async userid(): Promise<string> {
    return this.uid ?? (await this.user(), this.uid!);
  }

  async listSpeeches(source: "owned" | "shared"): Promise<OtterSpeech[]> {
    const uid = await this.userid();
    const url = `${this.base}speeches?userid=${encodeURIComponent(uid)}&page_size=1000&source=${source}`;
    const res = await this.request(url, { headers: this.headers() });
    const json = (await res.json()) as { speeches?: OtterSpeech[] };
    return json.speeches ?? [];
  }

  /** Owned + shared, deduped by otid (owned wins). */
  async listAllSpeeches(): Promise<OtterSpeech[]> {
    const byId = new Map<string, OtterSpeech>();
    for (const source of ["owned", "shared"] as const) {
      for (const sp of await this.listSpeeches(source)) {
        if (!byId.has(sp.otid)) byId.set(sp.otid, sp);
      }
    }
    return [...byId.values()];
  }

  /** bulk_export txt for one speech (works for owned AND shared); unzips if Otter returns a zip. */
  async exportTxt(otid: string): Promise<string> {
    const uid = await this.userid();
    const body = new URLSearchParams();
    body.set("formats", "txt");
    body.set("speech_otid_list", otid);
    const res = await this.request(`${this.base}bulk_export?userid=${encodeURIComponent(uid)}`, {
      method: "POST",
      headers: this.headers({
        "x-csrftoken": this.cookie.csrftoken,
        "content-type": "application/x-www-form-urlencoded",
      }),
      body,
    });
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      const files = unzipSync(bytes);
      const name = Object.keys(files)[0];
      if (!name) throw new Error(`bulk_export for ${otid} returned an empty zip`);
      return new TextDecoder().decode(files[name]!);
    }
    return new TextDecoder().decode(bytes);
  }
}

export function speechStamp(sp: OtterSpeech): string {
  return String(sp.transcript_updated_at ?? sp.modified_time ?? "");
}

export function speechStartEpoch(sp: OtterSpeech): number | null {
  return sp.start_time ?? sp.created_at ?? null;
}

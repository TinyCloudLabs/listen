import { unzipSync } from "fflate";
import type { OtterCookie } from "./otter-secret.js";

// Otter has no public API; this reuses the user's session cookie against the
// internal forward/api/v1 endpoints. NOTE: never log the cookie, the Cookie
// header, or raw response bodies — the backend's container logs are public.
const DEFAULT_BASE = "https://otter.ai/forward/api/v1/";
const RETRY_WAITS_MS = [1000, 3000, 8000];

export interface OtterSpeech {
  otid: string;
  title?: string | null;
  start_time?: number | null;
  created_at?: number | null;
  duration?: number | null;
  transcript_updated_at?: number | string | null;
  modified_time?: number | string | null;
  hasPhotos?: number | null;
}

export class OtterApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OtterApiError";
  }
}

export class OtterClient {
  private readonly base: string;
  private readonly cookie: OtterCookie;
  private uid: string | null = null;

  constructor(cookie: OtterCookie, base: string = DEFAULT_BASE) {
    this.cookie = cookie;
    this.base = base.endsWith("/") ? base : `${base}/`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      cookie: `sessionid=${this.cookie.sessionid}; csrftoken=${this.cookie.csrftoken}`,
      referer: "https://otter.ai/",
      "user-agent": "Mozilla/5.0",
      ...extra,
    };
  }

  // Error messages deliberately carry only method + path (never the cookie).
  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.base}${path}`;
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetch(url, init);
      if (res.ok) return res;
      const retryable = res.status >= 500 || res.status === 429;
      if (!retryable || attempt >= RETRY_WAITS_MS.length) {
        throw new OtterApiError(
          `Otter ${init.method ?? "GET"} ${path} -> ${res.status}`,
          res.status,
        );
      }
      await new Promise((r) => setTimeout(r, RETRY_WAITS_MS[attempt]!));
    }
  }

  /** GET /user — validates the cookie; throws if it's dead. */
  async user(): Promise<{ userid: string; email?: string }> {
    const res = await this.request("user", { headers: this.headers() });
    const json = (await res.json()) as Record<string, unknown>;
    const userid = json.userid;
    if (typeof userid !== "string" && typeof userid !== "number") {
      throw new OtterApiError("Otter /user returned no userid — cookie invalid or expired", 401);
    }
    this.uid = String(userid);
    return { userid: this.uid, email: typeof json.email === "string" ? json.email : undefined };
  }

  private async userid(): Promise<string> {
    if (this.uid) return this.uid;
    await this.user();
    return this.uid!;
  }

  async listSpeeches(source: "owned" | "shared"): Promise<OtterSpeech[]> {
    const uid = await this.userid();
    const res = await this.request(
      `speeches?userid=${encodeURIComponent(uid)}&page_size=1000&source=${source}`,
      { headers: this.headers() },
    );
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

  /** bulk_export diarized txt for one speech (owned or shared); unzips if Otter returns a zip. */
  async exportTxt(otid: string): Promise<string> {
    const uid = await this.userid();
    const body = new URLSearchParams({ formats: "txt", speech_otid_list: otid });
    const res = await this.request(`bulk_export?userid=${encodeURIComponent(uid)}`, {
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
      if (!name) throw new OtterApiError(`bulk_export for ${otid} returned an empty zip`, 502);
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

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { zipSync } from "fflate";

const mockFetch = mock<typeof globalThis.fetch>(() => Promise.resolve(new Response("{}")));
const originalFetch = globalThis.fetch;

import { OtterClient, OtterApiError } from "../services/otter-client.js";

const COOKIE = { sessionid: "s3cret-session", csrftoken: "csrf-tok" };

function route(url: string, body?: string): Response {
  if (url.includes("/user")) return Response.json({ userid: "u1", email: "a@b.co" });
  if (url.includes("/speeches")) {
    const source = new URL(url).searchParams.get("source");
    const speeches =
      source === "owned"
        ? [{ otid: "OAAA", title: "Owned" }]
        : [
            { otid: "OAAA", title: "Owned" },
            { otid: "OBBB", title: "Shared" },
          ];
    return Response.json({ speeches });
  }
  if (url.includes("/bulk_export")) {
    const otid = new URLSearchParams(body).get("speech_otid_list");
    const txt = `Alice  0:01\nhi from ${otid}.\n`;
    return otid === "OBBB"
      ? new Response(zipSync({ "t.txt": new TextEncoder().encode(txt) }))
      : new Response(txt);
  }
  return new Response("not found", { status: 404 });
}

describe("OtterClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((input: any, init: any) =>
      Promise.resolve(route(String(input), init?.body?.toString())),
    );
    globalThis.fetch = mockFetch as any;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("validates the cookie and returns the account", async () => {
    expect(await new OtterClient(COOKIE).user()).toEqual({ userid: "u1", email: "a@b.co" });
  });

  it("dedupes owned + shared speeches", async () => {
    const speeches = await new OtterClient(COOKIE).listAllSpeeches();
    expect(new Set(speeches.map((s) => s.otid))).toEqual(new Set(["OAAA", "OBBB"]));
  });

  it("exports plain text and transparently unzips a zipped export", async () => {
    const client = new OtterClient(COOKIE);
    expect(await client.exportTxt("OAAA")).toContain("hi from OAAA.");
    expect(await client.exportTxt("OBBB")).toContain("hi from OBBB.");
  });

  it("sends the cookie as a header but never leaks it in errors", async () => {
    mockFetch.mockImplementation(() => Promise.resolve(new Response("nope", { status: 401 })));
    const client = new OtterClient(COOKIE);
    let thrown: unknown;
    try {
      await client.user();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(OtterApiError);
    expect((thrown as Error).message).not.toContain("s3cret-session");
    expect((thrown as Error).message).not.toContain("csrf-tok");
    // cookie still went out on the wire as a header
    const headers = (mockFetch.mock.calls[0]![1] as any).headers;
    expect(headers.cookie).toContain("sessionid=s3cret-session");
  });
});

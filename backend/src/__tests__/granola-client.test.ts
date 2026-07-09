import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { GranolaClient, type GranolaNoteSummary } from "../services/granola-client.js";

const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof mock>;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function note(id: string): GranolaNoteSummary {
  return {
    id,
    title: id,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("GranolaClient pagination", () => {
  beforeEach(() => {
    mockFetch = mock();
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("continues past mixed known pages and only early-exits on a whole known page", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          notes: [note("new-1"), note("known-1")],
          hasMore: true,
          cursor: "page-2",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          notes: [note("new-2"), note("new-3")],
          hasMore: true,
          cursor: "page-3",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          notes: [note("known-1"), note("known-2")],
          hasMore: true,
          cursor: "page-4",
        }),
      );

    const client = new GranolaClient("granola-api-key", "https://granola.test");
    const result = await client.listAllNotes({
      pageSize: 2,
      mode: "incremental",
      knownIds: new Set(["known-1", "known-2"]),
    });

    expect(result.earlyExit).toBe(true);
    expect(result.pageCount).toBe(3);
    expect(result.notes.map((item) => item.id)).toEqual(["new-1", "new-2", "new-3"]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

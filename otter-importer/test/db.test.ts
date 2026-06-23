import { describe, expect, test } from "bun:test";
import { Store } from "../src/db.ts";

const speech = (over: Record<string, unknown> = {}) => ({
  otid: "OAAA",
  title: "Meeting",
  start_time: 1700000000,
  transcript_updated_at: 5,
  ...over,
});

describe("Store change detection", () => {
  test("new -> changed (on edit) -> unchanged", () => {
    const store = new Store(":memory:");
    expect(store.upsertSpeech(speech() as any)).toBe("created");
    expect(store.upsertSpeech(speech() as any)).toBe("unchanged");
    // Otter bumps transcript_updated_at when the transcript is edited
    expect(store.upsertSpeech(speech({ transcript_updated_at: 9 }) as any)).toBe("changed");
    store.close();
  });

  test("a changed speech re-enters the pull queue even after it was pulled", () => {
    const store = new Store(":memory:");
    store.upsertSpeech(speech() as any);
    store.savePull("OAAA", "[]", "", 0);
    expect(store.pendingPull(10)).toHaveLength(0);
    store.upsertSpeech(speech({ transcript_updated_at: 9 }) as any);
    expect(store.pendingPull(10).map((r) => r.otid)).toEqual(["OAAA"]);
    store.close();
  });

  test("counts group by status", () => {
    const store = new Store(":memory:");
    store.upsertSpeech(speech() as any);
    store.upsertSpeech(speech({ otid: "OBBB" }) as any);
    store.markPublished("OBBB", "otter-OBBB");
    expect(store.counts()).toEqual({ total: 2, scanned: 1, published: 1 });
    store.close();
  });
});

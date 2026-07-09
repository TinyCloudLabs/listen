import { afterEach, describe, expect, it } from "vitest";
import {
  conversationDetailCacheKey,
  conversationPageCacheKey,
  readConversationDetailCache,
  readConversationPageCache,
  writeConversationDetailCache,
  writeConversationPageCache,
} from "../conversationPageCache";

const PATH = "/api/conversations?limit=20&offset=0";

describe("conversation cache scoping", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps page and detail cache entries separate per signed-in key", () => {
    writeConversationPageCache(
      PATH,
      { conversations: [{ title: "Alice cache" }], total: 1 },
      "0xAlice",
    );
    writeConversationPageCache(
      PATH,
      { conversations: [{ title: "Bob cache" }], total: 1 },
      "0xBob",
    );
    writeConversationDetailCache("01ABC", { title: "Alice detail" }, "0xAlice");
    writeConversationDetailCache("01ABC", { title: "Bob detail" }, "0xBob");

    expect(readConversationPageCache<{ title: string }>(PATH, "0xALICE")?.conversations).toEqual([
      { title: "Alice cache" },
    ]);
    expect(readConversationPageCache<{ title: string }>(PATH, "0xBob")?.conversations).toEqual([
      { title: "Bob cache" },
    ]);
    expect(readConversationDetailCache<{ title: string }>("01ABC", "0xAlice")?.data).toEqual({
      title: "Alice detail",
    });
    expect(readConversationDetailCache<{ title: string }>("01ABC", "0xBob")?.data).toEqual({
      title: "Bob detail",
    });
  });

  it("does not read legacy unscoped entries when a signed-in key is provided", () => {
    localStorage.setItem(
      conversationPageCacheKey(PATH),
      JSON.stringify({
        conversations: [{ title: "Legacy page" }],
        total: 1,
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );
    localStorage.setItem(
      conversationDetailCacheKey("01ABC"),
      JSON.stringify({
        data: { title: "Legacy detail" },
        cachedAt: "2026-03-20T15:00:00Z",
      }),
    );

    expect(readConversationPageCache(PATH, "0xAlice")).toBeNull();
    expect(readConversationDetailCache("01ABC", "0xAlice")).toBeNull();
  });
});

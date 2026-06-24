import { describe, it, expect } from "bun:test";
import { normalizeOtter } from "../adapters/otter.js";

const TXT = `Alice Chen  0:05
Hello everyone.

Bo  0:12
Thanks for joining.
`;

describe("normalizeOtter", () => {
  it("maps an Otter speech to the Listen conversation contract", () => {
    const c = normalizeOtter(
      { otid: "OAAA", title: "Standup", start_time: 1700000000, duration: 120, hasPhotos: 0 },
      TXT,
    );
    expect(c.conversation.id).toBe("otter-OAAA");
    expect(c.conversation.source).toBe("otter");
    expect(c.conversation.source_id).toBe("otter:OAAA");
    expect(c.conversation.source_url).toBe("https://otter.ai/u/OAAA");
    expect(c.conversation.started_at).toBe(new Date(1700000000 * 1000).toISOString());
    expect(c.conversation.ended_at).toBe(new Date((1700000000 + 120) * 1000).toISOString());
    expect(c.conversation.metadata).toMatchObject({ otid: "OAAA", segment_count: 2 });
    expect(c.participants.map((p) => p.name)).toEqual(["Alice Chen", "Bo"]);
    expect((c.transcript as any[]).length).toBe(2);
  });

  it("falls back to a default title and null times", () => {
    const c = normalizeOtter({ otid: "OBBB" }, TXT);
    expect(c.conversation.title).toBe("Otter conversation");
    expect(c.conversation.started_at).toBeNull();
    expect(c.conversation.ended_at).toBeNull();
  });
});

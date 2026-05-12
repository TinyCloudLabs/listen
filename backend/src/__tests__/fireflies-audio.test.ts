import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { downloadAudio } from "../services/fireflies-audio.js";

const originalFetch = globalThis.fetch;
const mockFetch = mock<typeof globalThis.fetch>(() => Promise.resolve(new Response()));

function audioResponse(body = "fake mp3", init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "audio/mpeg", ...init.headers },
    ...init,
  });
}

describe("fireflies audio", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("downloads public audio without sending the API key", async () => {
    mockFetch.mockResolvedValueOnce(audioResponse());

    const audio = await downloadAudio("https://audio.example.com/meeting.mp3", "secret-key");

    expect(audio.contentType).toBe("audio/mpeg");
    expect(audio.sizeBytes).toBe(8);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1]).toBeUndefined();
  });

  it("retries with the Fireflies API key after auth failure", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("", { status: 403 }))
      .mockResolvedValueOnce(audioResponse());

    await downloadAudio("https://audio.example.com/meeting.mp3", "secret-key");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [, init] = mockFetch.mock.calls[1];
    expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer secret-key" });
  });

  it("rejects audio over the configured byte limit", async () => {
    mockFetch.mockResolvedValueOnce(
      audioResponse("fake mp3", { headers: { "content-length": "9" } }),
    );

    await expect(
      downloadAudio("https://audio.example.com/meeting.mp3", "secret-key", 8),
    ).rejects.toThrow(/too large/);
  });
});

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { Buffer } from "node:buffer";
import { downloadAudio, storeAudio } from "../services/fireflies-audio.js";

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

  it("stores audio data separately from metadata using the string-KV fallback", async () => {
    const data = new Map<string, string>();
    const access = {
      kv: {
        put: async (key: string, value: string) => {
          data.set(key, value);
          return { ok: true };
        },
      },
    } as any;

    const stored = await storeAudio(
      access,
      "conv-1",
      {
        bytes: new TextEncoder().encode("fake mp3").buffer,
        contentType: "audio/webm",
        sizeBytes: 8,
      },
      { sourceUrl: "https://audio.example.com/meeting.webm" },
    );

    expect(stored.audio_data_kv_key).toBe("audio/conv-1/recording.base64");
    expect(stored.audio_metadata_kv_key).toBe("audio/conv-1/recording.json");
    expect(stored.audio_storage_encoding).toBe("base64-string-kv");
    expect(data.get(stored.audio_data_kv_key)).toBe(Buffer.from("fake mp3").toString("base64"));

    const sidecar = JSON.parse(data.get(stored.audio_metadata_kv_key)!);
    expect(sidecar.contentType).toBe("audio/webm");
    expect(sidecar.sizeBytes).toBe(8);
    expect(sidecar.storage).toEqual({
      type: "string-kv",
      encoding: "base64",
      interimUntil: "TC-1368",
    });
    expect(sidecar.source.audioUrl).toBe("https://audio.example.com/meeting.webm");
  });
});

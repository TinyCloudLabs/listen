import { afterEach, describe, expect, it, vi } from "vitest";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

const sdkMocks = vi.hoisted(() => {
  const state = {
    kvInstances: [] as Array<{
      initialize: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      createSignedReadUrl: ReturnType<typeof vi.fn>;
    }>,
    kvBehaviors: [] as Array<{
      get?: ReturnType<typeof vi.fn>;
      createSignedReadUrl?: ReturnType<typeof vi.fn>;
    }>,
  };

  return {
    state,
    BrowserWasmBindings: vi.fn(function BrowserWasmBindings(this: { invoke: () => void }) {
      this.invoke = vi.fn();
      return {
        invoke: this.invoke,
        ensureInitialized: vi.fn(async () => undefined),
      };
    }),
    KVService: vi.fn(function KVService() {
      const behavior = state.kvBehaviors.shift();
      const instance = {
        initialize: vi.fn(),
        get: behavior?.get ?? vi.fn(),
        createSignedReadUrl: behavior?.createSignedReadUrl ?? vi.fn(),
      };
      state.kvInstances.push(instance);
      return instance;
    }),
  };
});

vi.mock("@tinycloud/web-sdk", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tinycloud/web-sdk")>();
  return {
    ...original,
    BrowserWasmBindings: sdkMocks.BrowserWasmBindings,
    KVService: sdkMocks.KVService,
    deserializeDelegation: vi.fn(() => ({
      delegationHeader: { Authorization: "Bearer delegated" },
      cid: "delegated-cid",
      spaceId: "space",
    })),
    serializeDelegation: vi.fn(() => "serialized-delegation"),
  };
});

vi.mock("@tinycloud/sdk-core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tinycloud/sdk-core")>();
  return {
    ...original,
    ServiceContext: vi.fn(function ServiceContext(this: { setSession: () => void }) {
      this.setSession = vi.fn();
      return this;
    }),
  };
});

import {
  createListenShareLink,
  hasShareableAudio,
  loadSharedConversationDetail,
  type ShareableConversationDetail,
  type StoredListenShare,
} from "../lib/listenShareLinks";

function encodedShare(path: string) {
  return {
    path,
    host: "https://node.tinycloud.xyz",
    spaceId: "space",
    keyDid: "did:key:zshare#zshare",
    key: { kty: "OKP", crv: "Ed25519", x: "share" },
    delegation: { cid: "snapshot-cid", authHeader: "Bearer snapshot-cid" },
  };
}

function detail(overrides: Partial<ShareableConversationDetail["conversation"]> = {}) {
  return {
    conversation: {
      id: "01ABC",
      title: "Planning",
      source: "fireflies",
      source_url: null,
      started_at: "2026-05-14T14:00:00Z",
      ended_at: "2026-05-14T14:20:00Z",
      duration_secs: 1200,
      summary: "Roadmap",
      metadata: {},
      ...overrides,
    },
    participants: [{ id: "p1", name: "Ada" }],
    transcript: [{ speakerName: "Ada", text: "Hello", startTime: 0, endTime: 1 }],
  } satisfies ShareableConversationDetail;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  sdkMocks.state.kvInstances.length = 0;
  sdkMocks.state.kvBehaviors.length = 0;
});

describe("listen share links", () => {
  it("creates a share for one KV snapshot instead of the whole SQL database", async () => {
    const put = vi.fn(async () => ({ ok: true, data: {} }));
    const generate = vi.fn(async (input: { path: string; expiry: Date; actions: string[] }) => ({
      ok: true,
      data: { token: "snapshot-token", expiresAt: input.expiry },
    }));
    const decodeLink = vi.fn((token: string) => {
      expect(token).toBe("snapshot-token");
      return encodedShare(generate.mock.calls[0]?.[0].path);
    });
    const tcw = {
      session: () => ({ siwe: "Expiration Time: 2099-01-01T00:00:00.000Z" }),
      kv: { put },
      sharing: { updateConfig: vi.fn(), generate, decodeLink },
      delegateTo: vi.fn(),
    } as unknown as TinyCloudWeb;

    const result = await createListenShareLink(
      tcw,
      detail({ metadata: { audio_playback_url: "/api/conversations/01ABC/audio" } }),
      { includeTranscript: true, includeAudio: true, durationDays: 7 },
    );

    expect(put).toHaveBeenCalledTimes(1);
    const [path, value] = put.mock.calls[0]!;
    expect(path).toMatch(/^xyz\.tinycloud\.listen\/shares\/01ABC\//);
    expect(JSON.parse(value as string).conversation.metadata).not.toHaveProperty(
      "audio_playback_url",
    );
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        path,
        actions: ["tinycloud.kv/get"],
      }),
    );
    expect(generate.mock.calls[0]?.[0].actions).not.toContain("tinycloud.sql/read");
    expect(result.payload.snapshot.path).toBe(path);
    expect(result.payload).not.toHaveProperty("sql");
    expect(tcw.delegateTo).not.toHaveBeenCalled();
  });

  it("keeps requested share duration beyond the active session and wallet-signs audio grants", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T14:00:00.000Z"));

    const requestedExpiry = new Date("2026-05-21T14:00:00.000Z");
    const put = vi.fn(async () => ({ ok: true, data: {} }));
    const generate = vi.fn(async (input: { path: string; expiry: Date }) => ({
      ok: true,
      data: { token: "snapshot-token", expiresAt: input.expiry },
    }));
    const delegateTo = vi.fn(async () => ({
      delegation: { expiry: requestedExpiry },
    }));
    const tcw = {
      session: () => ({ siwe: "Expiration Time: 2026-05-14T15:00:00.000Z" }),
      kv: { put },
      sharing: { updateConfig: vi.fn(), generate, decodeLink: vi.fn(encodedShare) },
      delegateTo,
    } as unknown as TinyCloudWeb;

    const result = await createListenShareLink(
      tcw,
      detail({ metadata: { audio_data_kv_key: "audio/01ABC/recording" } }),
      { includeTranscript: true, includeAudio: true, durationDays: 7 },
    );

    expect(generate.mock.calls[0]?.[0].expiry.toISOString()).toBe(requestedExpiry.toISOString());
    expect(result.payload.expiresAt).toBe(requestedExpiry.toISOString());
    expect(tcw.sharing.updateConfig).toHaveBeenCalledWith({
      sessionExpiry: new Date("2026-05-14T14:59:00.000Z"),
    });
    expect(delegateTo).toHaveBeenCalledWith(
      "did:key:zshare",
      [
        {
          service: "tinycloud.kv",
          path: "xyz.tinycloud.listen/audio/01ABC/recording",
          actions: ["get"],
          skipPrefix: true,
        },
      ],
      { expiry: 7 * 24 * 60 * 60 * 1000, forceWalletSign: true },
    );
  });

  it("only treats KV-backed audio as shareable", () => {
    expect(
      hasShareableAudio(detail({ metadata: { audio_playback_url: "https://example.com/a.mp3" } })),
    ).toBe(false);
    expect(hasShareableAudio(detail({ metadata: { audio_kv_key: "audio/01ABC/recording" } }))).toBe(
      true,
    );
  });

  it("removes shared audio playback when the audio grant cannot resolve data", async () => {
    const snapshot = {
      conversation: {
        ...detail().conversation,
        metadata: {
          audio_data_kv_key: "audio/01ABC/recording",
          audio_playback_url: "/api/conversations/01ABC/audio",
        },
      },
      participants: [],
      transcript: [{ speakerName: "Ada", text: "Hello" }],
    };
    const share = {
      ...encodedShare("xyz.tinycloud.listen/shares/01ABC/share.json"),
      format: "listen.share",
      version: 2,
      id: "01ABC:share",
      conversationId: "01ABC",
      title: "Planning",
      createdAt: "2026-05-14T14:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
      snapshot: encodedShare("xyz.tinycloud.listen/shares/01ABC/share.json"),
      audio: {
        path: "xyz.tinycloud.listen/audio/01ABC/recording",
        serialized: "serialized-delegation",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      acceptedAt: "2026-05-14T14:00:00.000Z",
      token: "ls1:test",
    } as StoredListenShare;

    sdkMocks.state.kvBehaviors.push(
      {
        get: vi.fn(async () => ({
          ok: true,
          data: { data: JSON.stringify(snapshot) },
        })),
      },
      {
        createSignedReadUrl: vi.fn(async () => {
          throw new Error("delegation failed");
        }),
      },
    );

    const result = await loadSharedConversationDetail(share);

    expect(result.conversation.metadata).not.toHaveProperty("audio_playback_url");
    expect(sdkMocks.state.kvInstances[1]?.createSignedReadUrl).toHaveBeenCalledWith(
      "xyz.tinycloud.listen/audio/01ABC/recording",
    );
  });
});

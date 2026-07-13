import { describe, expect, it, vi, beforeEach } from "vitest";
import { Wallet } from "ethers";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import { POLICY_STATUS_SCHEMA as ROOT_POLICY_STATUS_SCHEMA } from "@tinycloud/sdk-core";
import { TranscriptRequester, createTranscriptRequester } from "@tinycloud/sdk-core-m1";
import { POLICY_STATUS_SCHEMA as POLICY_POLICY_STATUS_SCHEMA } from "@tinycloud/sdk-core/policy";

import {
  assertConcreteRawPath,
  assertGrantableActionUrns,
  assertServiceNativeCaveats,
  assertStrictRfc3339DateTime,
  composeListenOwnerShareDraft,
  ListenOwnerShareError,
  validateOwnerShareInput,
  type PublishedListenOwnerShare,
} from "../lib/listenOwnerShares";
import type { ShareableConversationDetail } from "../lib/listenShareLinks";

function detail(
  id: string,
  title: string,
  metadata: Record<string, unknown> = {},
): ShareableConversationDetail {
  return {
    conversation: {
      id,
      title,
      source: "manual",
      source_url: null,
      started_at: "2026-05-14T14:00:00Z",
      ended_at: "2026-05-14T14:20:00Z",
      duration_secs: 1200,
      summary: "Roadmap",
      metadata,
      transcript_json: [{ speaker: "Ada", text: "Hello" }],
      created_at: "2026-05-14T14:00:00Z",
      updated_at: "2026-05-14T14:00:00Z",
    },
    participants: [{ id: "p1", name: "Ada", email: "ada@example.com", speaker_label: "Speaker 1" }],
    transcript: [{ speakerName: "Ada", text: "Hello", startTime: 0, endTime: 1 }],
  };
}

function expectCode(fn: () => unknown, code: string) {
  expect(fn).toThrow(ListenOwnerShareError);
  try {
    fn();
  } catch (err) {
    expect((err as ListenOwnerShareError).code).toBe(code);
  }
}

function installLocalStorage() {
  const data = new Map<string, string>();
  const storage = {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
    clear: () => data.clear(),
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

describe("listen owner share validation", () => {
  it("rejects non-strict RFC 3339 date-times", () => {
    expectCode(() => assertStrictRfc3339DateTime("2026-05-14"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime("2026-05-14T14:00:00"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime("2026-02-30T00:00:00Z"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime("2026-13-01T00:00:00Z"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime("2026-00-01T00:00:00Z"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime("2026-04-31T00:00:00Z"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime("2026-05-00T00:00:00Z"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime("2026-05-14T24:00:00Z"), "invalid-date-time");
    expectCode(() => assertStrictRfc3339DateTime(123), "invalid-date-time");
    expect(assertStrictRfc3339DateTime("2026-05-14T14:00:00Z")).toBe("2026-05-14T14:00:00Z");
    expect(assertStrictRfc3339DateTime("2026-05-14T14:00:00+02:00")).toBe("2026-05-14T12:00:00Z");
  });

  it("rejects traversing, escaping, prefix, and double-slash paths", () => {
    expectCode(() => assertConcreteRawPath("audio/../secret"), "invalid-path");
    expectCode(() => assertConcreteRawPath("audio//recording"), "invalid-path");
    expectCode(() => assertConcreteRawPath("audio/%2e%2e/secret"), "invalid-path");
    expectCode(() => assertConcreteRawPath("audio/"), "invalid-path");
    expect(assertConcreteRawPath("audio/01ABC/recording")).toBe("audio/01ABC/recording");
  });

  it("rejects short names and wildcard actions", () => {
    expectCode(() => assertGrantableActionUrns(["get"]), "invalid-action");
    expectCode(() => assertGrantableActionUrns(["tinycloud.kv/*"]), "invalid-action");
    expect(assertGrantableActionUrns(["tinycloud.kv/get"])).toEqual(["tinycloud.kv/get"]);
  });

  it("rejects client-invented caveats outside SQL", () => {
    expectCode(
      () =>
        assertServiceNativeCaveats({
          service: "tinycloud.kv",
          path: "audio/01ABC",
          actions: ["tinycloud.kv/get"],
          caveats: { conversationId: "01ABC" },
        }),
      "invalid-caveat",
    );
    expectCode(
      () =>
        assertServiceNativeCaveats({
          service: "tinycloud.sql",
          path: "xyz.tinycloud.listen/conversations",
          actions: ["tinycloud.sql/read"],
          caveats: { mode: "client-filter", readOnly: true, statements: [] },
        }),
      "invalid-caveat",
    );
  });

  it("rejects unsafe prototypes and unknown external fields", () => {
    expectCode(() => validateOwnerShareInput(new Date()), "invalid-prototype");
    expectCode(
      () => validateOwnerShareInput({ conversationIds: ["01ABC"], futureTranscripts: true }),
      "unknown-field",
    );
    expectCode(
      () => validateOwnerShareInput({ conversationIds: ["01ABC"], emailDomain: "not a domain" }),
      "invalid-input",
    );
  });
});

describe("listen owner share draft composition", () => {
  it("uses the vendored M1 SDK root export for policy identity", () => {
    expect(ROOT_POLICY_STATUS_SCHEMA).toBe(POLICY_POLICY_STATUS_SCHEMA);
  });

  it("composes capabilities for exactly the selected conversation IDs", () => {
    const draft = composeListenOwnerShareDraft(
      [detail("conversation-a", "A"), detail("conversation-b", "B")],
      {
        conversationIds: ["conversation-b", "conversation-a", "conversation-b"],
        emailDomain: "Issuer.Credentials.org",
        createdAt: "2026-05-14T14:00:00Z",
      },
    );

    expect(draft.conversationIds).toEqual(["conversation-b", "conversation-a"]);
    expect(draft.capabilities).toHaveLength(2);
    expect(draft.capabilities.every((capability) => capability.service === "tinycloud.sql")).toBe(
      true,
    );
    expect(JSON.stringify(draft.capabilities)).toContain("listen.getConversation");
    expect(JSON.stringify(draft.capabilities)).toContain("listen.listParticipants");
    expect(JSON.stringify(draft.capabilities)).toContain("conversation-a");
    expect(JSON.stringify(draft.capabilities)).toContain("conversation-b");
    expect(JSON.stringify(draft.capabilities)).not.toMatch(/future|prefix|tag|wildcard/i);
  });

  it("derives disclosure from composed transcript capabilities and states audio is omitted", () => {
    const draft = composeListenOwnerShareDraft(
      [
        detail("conversation-a", "A", { audio_data_kv_key: "audio/conversation-a/recording" }),
        detail("conversation-b", "B", { adapter_catalog: { audio: "audio/conversation-b" } }),
      ],
      {
        conversationIds: ["conversation-a", "conversation-b"],
        emailDomain: "issuer.credentials.org",
        createdAt: "2026-05-14T14:00:00Z",
      },
    );

    expect(
      draft.capabilities.filter((capability) => capability.service === "tinycloud.kv"),
    ).toHaveLength(0);
    expect(
      draft.disclosure.conversations.find((item) => item.conversationId === "conversation-a"),
    ).toMatchObject({ audioIncluded: false, participants: ["Ada"] });
    expect(
      draft.disclosure.conversations.find((item) => item.conversationId === "conversation-b"),
    ).toMatchObject({ audioIncluded: false });
  });

  it("never composes audio or KV grants from metadata-shaped audio hints", () => {
    const metadataVariants: Record<string, unknown>[] = [
      { adapter_catalog: { audio: { path: "audio/a", actions: ["tinycloud.kv/get"] } } },
      { adapterCatalog: { audio: { path: "audio/a", actions: ["tinycloud.kv/get"] } } },
      { audio_capability: { path: "audio/a", actions: ["tinycloud.kv/get"] } },
      { audioCapability: { path: "audio/a", actions: ["tinycloud.kv/get"] } },
      { audioCapabilities: [{ path: "audio/a", actions: ["tinycloud.kv/get"] }] },
      { audio_capabilities: [{ path: "audio/a", actions: ["tinycloud.kv/get"] }] },
      { audio_capability_paths: ["audio/a"] },
      { audioCapabilityPaths: ["audio/a"] },
      { audio_data_kv_key: "audio/a" },
      { audioDataKvKey: "audio/a" },
      { audio_kv_key: "audio/a" },
      { audioKvKey: "audio/a" },
      { AUDIO_CAPABILITY: { path: "audio/a", actions: ["tinycloud.kv/get"] } },
      { Adapter_Catalog: { audio: { path: "audio/a", actions: ["tinycloud.kv/get"] } } },
    ];

    for (const [index, metadata] of metadataVariants.entries()) {
      const draft = composeListenOwnerShareDraft(
        [detail(`conversation-${index}`, `Variant ${index}`, metadata)],
        {
          conversationIds: [`conversation-${index}`],
          emailDomain: "issuer.credentials.org",
          createdAt: "2026-05-14T14:00:00Z",
        },
      );
      expect(draft.capabilities.every((capability) => capability.service === "tinycloud.sql")).toBe(
        true,
      );
      expect(draft.disclosure.conversations[0]?.audioIncluded).toBe(false);
    }
  });
});

describe("listen owner share publish and revoke", () => {
  const testWallet = new Wallet(`0x${"11".repeat(32)}`);

  beforeEach(() => {
    installLocalStorage();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  async function importPublishModule() {
    return await import("../lib/listenOwnerShares");
  }

  function tcw(put = vi.fn(async () => ({ ok: true }))): TinyCloudWeb {
    return {
      session: () => ({ address: "0x0000000000000000000000000000000000000abc", chainId: 1 }),
      provider: {
        getSigner: () => ({ signMessage: vi.fn(async () => `0x${"11".repeat(64)}1b`) }),
      },
      kv: { put },
    } as unknown as TinyCloudWeb;
  }

  function signedTcw(put = vi.fn(async () => ({ ok: true }))): TinyCloudWeb {
    return {
      session: () => ({ address: testWallet.address, chainId: 1 }),
      provider: {
        getSigner: () => ({ signMessage: (value: Uint8Array) => testWallet.signMessage(value) }),
      },
      kv: { put },
    } as unknown as TinyCloudWeb;
  }

  function draft() {
    const composed = composeListenOwnerShareDraft([detail("conversation-a", "A")], {
      conversationIds: ["conversation-a"],
      emailDomain: "issuer.credentials.org",
      createdAt: "2026-05-14T14:00:00.000Z",
      expiresAt: "2026-06-13T14:00:00.000Z",
    });
    return {
      ...composed,
      shareId: "share-1",
    };
  }

  it("publishes only after policy, engine record, status, and bootstrap writes confirm", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    const { publishListenOwnerShare, listPublishedListenOwnerShares } = await importPublishModule();

    const published = await publishListenOwnerShare(tcw(put), draft());

    expect(put).toHaveBeenCalledTimes(4);
    expect(published.status).toBe("active");
    expect(published.policyId).toMatch(/^pol_/);
    expect(published.bootstrap.policyId).toBe(published.policyId);
    expect(published.bootstrap.policyEngine.signedRecord.engineRecordId).toMatch(/^peng_/);
    const policyWrite = put.mock.calls.find(([path]) => path === published.policyPath);
    const policy = JSON.parse(String(policyWrite?.[1])) as {
      when: {
        evidence: {
          requirements: unknown;
        };
      };
    };
    expect(policy.when.evidence.requirements).toEqual({
      type: "opencredentials.email/v1",
      emailDomains: ["issuer.credentials.org"],
    });
    expect(listPublishedListenOwnerShares()).toHaveLength(1);
  });

  it("produces a bootstrap accepted by the vendored requester with the signed policy ceiling", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    const { publishListenOwnerShare } = await importPublishModule();
    const published = await publishListenOwnerShare(signedTcw(put), draft());
    const policyWrite = put.mock.calls.find(([path]) => path === published.policyPath);
    const policy = JSON.parse(String(policyWrite?.[1])) as {
      ownerDid: string;
      resource: { permissionsCeiling: unknown[] };
    };
    const resourceHint = published.bootstrap.resourceHint as Record<string, unknown>;

    expect(Object.keys(resourceHint)).toEqual([
      "resourceType",
      "resourceId",
      "requestedCapabilities",
    ]);
    expect(resourceHint.requestedCapabilities).toEqual(policy.resource.permissionsCeiling);

    const requester = await createTranscriptRequester({
      bootstrap: published.bootstrap,
      requesterDid: "did:key:zObviouslyFakeRequester",
      ownerDid: policy.ownerDid,
      audience: published.bootstrap.policyEngine.audience,
      grantIssuerDid: published.bootstrap.policyEngine.signedRecord.grantIssuerDid,
      transport: {
        request: vi.fn(async () => {
          throw new Error("construction must not make an HTTP request");
        }),
        resolveEndpoint: vi.fn(async () => ({ addresses: ["8.8.8.8"] })),
      },
      now: () => new Date("2026-05-15T00:00:00Z"),
    });

    expect(requester).toBeInstanceOf(TranscriptRequester);
  });

  it("quarantines empty, malformed, legacy, and extended resource hints", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    const { getPublishedListenOwnerShareProjection, publishListenOwnerShare } =
      await importPublishModule();
    await publishListenOwnerShare(signedTcw(put), draft());

    const key = "listen:owner-transcript-shares:v1";
    const baseline = JSON.parse(window.localStorage.getItem(key)!) as Array<{
      bootstrap: { resourceHint: Record<string, unknown> };
    }>;
    const validHint = baseline[0]!.bootstrap.resourceHint;
    const invalidHints: Record<string, Record<string, unknown>> = {
      empty: { ...validHint, requestedCapabilities: [] },
      malformed: { ...validHint, requestedCapabilities: [{}] },
      legacy: {
        resourceType: validHint.resourceType,
        resourceId: validHint.resourceId,
        sqlDatabaseHint: "conversations",
        sqlStatementHints: ["listen.getConversation"],
        pathHints: [],
      },
      extended: { ...validHint, futureHint: true },
    };

    for (const resourceHint of Object.values(invalidHints)) {
      const stored = structuredClone(baseline);
      stored[0]!.bootstrap.resourceHint = resourceHint;
      window.localStorage.setItem(key, JSON.stringify(stored));
      expect(getPublishedListenOwnerShareProjection()).toMatchObject({
        quarantined: true,
        shares: [],
      });
    }
  });

  it("does not present a half-published share as live on write failure", async () => {
    const put = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: { message: "engine write failed" } });
    const { publishListenOwnerShare, listPublishedListenOwnerShares } = await importPublishModule();

    await expect(publishListenOwnerShare(tcw(put), draft())).rejects.toMatchObject({
      code: "transport-failed",
    });
    expect(listPublishedListenOwnerShares()).toHaveLength(0);
  });

  it("revokes through a signed PolicyStatus update and leaves active state on transport failure", async () => {
    const put = vi.fn(async () => ({ ok: false, error: { message: "status write failed" } }));
    const { revokeListenOwnerShare } = await importPublishModule();
    const share: PublishedListenOwnerShare = {
      shareId: "share-1",
      policyId: "pol_1",
      status: "active",
      createdAt: "2026-05-14T14:00:00.000Z",
      updatedAt: "2026-05-14T14:00:00.000Z",
      conversationIds: ["conversation-a"],
      credentialRule: {
        credentialClass: "w3c.vc/credential/v1",
        credentialType: "opencredentials.email/v1",
        acceptedIssuers: ["did:web:issuer.credentials.org"],
        emailDomains: ["issuer.credentials.org"],
      },
      disclosure: { conversations: [] },
      bootstrap: { policyId: "pol_1" } as PublishedListenOwnerShare["bootstrap"],
      policyPath: "xyz.tinycloud.listen/owner-shares/share-1/policy-pol_1.json",
      statusPath: "xyz.tinycloud.listen/owner-shares/share-1/status.json",
      bootstrapPath: "xyz.tinycloud.listen/owner-shares/share-1/bootstrap.json",
      engineRecordPath: "xyz.tinycloud.listen/owner-shares/share-1/engine-peng_1.json",
    };

    await expect(revokeListenOwnerShare(tcw(put), share)).rejects.toMatchObject({
      code: "transport-failed",
    });
    expect(put).toHaveBeenCalledTimes(1);
    const statusWrite = JSON.parse(String(put.mock.calls[0]?.[1] ?? "{}")) as {
      disposition?: unknown;
      sequence?: unknown;
    };
    expect(statusWrite).toMatchObject({ disposition: "revoked", sequence: 2 });
  });

  it("quarantines persisted shares with unsupported credential rules", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    const { getPublishedListenOwnerShareProjection, publishListenOwnerShare } =
      await importPublishModule();
    await publishListenOwnerShare(tcw(put), draft());

    const key = "listen:owner-transcript-shares:v1";
    const baseline = JSON.parse(window.localStorage.getItem(key)!) as Array<{
      credentialRule: Record<string, unknown>;
    }>;
    const invalidRules: Array<(rule: Record<string, unknown>) => void> = [
      (rule) => delete rule.credentialType,
      (rule) => {
        rule.credentialType = "opencredentials.profile/v1";
      },
      (rule) => {
        rule.acceptedIssuers = ["did:web:untrusted.example"];
      },
      (rule) => {
        rule.emailDomains = ["Issuer.Credentials.org"];
      },
      (rule) => {
        rule.emailDomains = ["not a domain"];
      },
    ];

    for (const mutateRule of invalidRules) {
      const stored = structuredClone(baseline);
      mutateRule(stored[0]!.credentialRule);
      window.localStorage.setItem(key, JSON.stringify(stored));
      expect(getPublishedListenOwnerShareProjection()).toMatchObject({
        quarantined: true,
        shares: [],
      });
    }
  });

  it("quarantines persisted share projections with unknown bootstrap fields", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    const {
      getPublishedListenOwnerShareProjection,
      publishListenOwnerShare,
      listPublishedListenOwnerShares,
    } = await importPublishModule();
    await publishListenOwnerShare(tcw(put), draft());

    const key = "listen:owner-transcript-shares:v1";
    const raw = window.localStorage.getItem(key);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Array<{
      bootstrap: { policyEngine: { signedRecord: Record<string, unknown> } };
    }>;
    parsed[0]!.bootstrap.policyEngine.signedRecord.extra = true;
    window.localStorage.setItem(key, JSON.stringify(parsed));

    expect(getPublishedListenOwnerShareProjection()).toMatchObject({
      quarantined: true,
      shares: [],
    });
    expect(listPublishedListenOwnerShares()).toEqual([]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";
import {
  LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS,
  LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS,
  LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES,
} from "@listen/client";

import { ConversationList } from "../components/ConversationList";
import { ListenOwnerShareDialog } from "../components/ListenOwnerShareDialog";
import {
  composeListenOwnerShareDraft,
  publishListenOwnerShare,
  REVOKE_COPY,
  revokeListenOwnerShare,
  type ListenOwnerShareDraft,
  type PublishedListenOwnerShare,
} from "../lib/listenOwnerShares";
import type { ShareableConversationDetail } from "../lib/listenShareLinks";

type CapturedWrite = {
  path: string;
  value: Record<string, unknown>;
};

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
    participants: [
      { id: "p1", name: "Ada", email: "ada@example.com", speaker_label: "Speaker 1" },
      { id: "p2", name: "Grace", email: "grace@example.com", speaker_label: "Speaker 2" },
    ],
    transcript: [{ speakerName: "Ada", text: "Hello", startTime: 0, endTime: 1 }],
  };
}

function pageConversation(item: ShareableConversationDetail) {
  return {
    id: item.conversation.id,
    title: item.conversation.title,
    source: item.conversation.source,
    source_url: item.conversation.source_url,
    started_at: item.conversation.started_at,
    duration_secs: item.conversation.duration_secs,
    summary: item.conversation.summary,
    created_at: item.conversation.created_at,
    participant_count: item.participants.length,
  };
}

function api(details: Record<string, ShareableConversationDetail>): ApiClient {
  return {
    get: vi.fn(async (path: string) => {
      if (path.startsWith("/api/conversations?")) {
        const conversations = Object.values(details).map(pageConversation);
        return { conversations, total: conversations.length };
      }
      const id = decodeURIComponent(path.split("/").pop() ?? "");
      const result = details[id];
      if (!result) throw new Error(`missing ${id}`);
      return result;
    }),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  };
}

function tcw(writes: CapturedWrite[] = []): TinyCloudWeb {
  return {
    session: () => ({ address: "0x0000000000000000000000000000000000000abc", chainId: 1 }),
    provider: {
      getSigner: () => ({ signMessage: vi.fn(async () => `0x${"11".repeat(64)}1b`) }),
    },
    kv: {
      put: vi.fn(async (path: string, value: string) => {
        writes.push({ path, value: JSON.parse(value) as Record<string, unknown> });
        return { ok: true };
      }),
    },
  } as unknown as TinyCloudWeb;
}

function fixedDraft(
  details: readonly ShareableConversationDetail[],
  conversationIds: readonly string[],
): ListenOwnerShareDraft {
  return {
    ...composeListenOwnerShareDraft(details, {
      conversationIds,
      emailDomain: "issuer.credentials.org",
      createdAt: "2026-05-14T14:00:00Z",
      expiresAt: "2026-06-13T14:00:00Z",
    }),
    shareId: "share-1",
  };
}

function stableComposition(draft: ListenOwnerShareDraft) {
  return {
    conversationIds: draft.conversationIds,
    capabilities: draft.capabilities,
    disclosure: draft.disclosure,
    credentialRule: draft.credentialRule,
    createdAt: draft.createdAt,
    expiresAt: draft.expiresAt,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sqlStatements(draft: ListenOwnerShareDraft) {
  return draft.capabilities.flatMap((capability) => {
    const caveats = capability.caveats as { statements?: unknown };
    return Array.isArray(caveats.statements)
      ? (caveats.statements as Array<Record<string, unknown>>)
      : [];
  });
}

function writeBySuffix(writes: readonly CapturedWrite[], suffix: string): CapturedWrite {
  const write = writes.find((entry) => entry.path.endsWith(suffix));
  expect(write).toBeTruthy();
  return write!;
}

async function enabledPublishButton() {
  await enterEmailDomain();
  const button = await screen.findByRole("button", { name: /Publish share/i });
  await waitFor(() => expect(button).not.toBeDisabled());
  return button;
}

async function enterEmailDomain() {
  const input = await screen.findByRole("textbox", { name: /Verified email domain/i });
  fireEvent.change(input, { target: { value: "issuer.credentials.org" } });
}

function OwnerShareSelectionHarness({
  ownerApi,
  tinyCloud,
}: {
  ownerApi: ApiClient;
  tinyCloud: TinyCloudWeb;
}) {
  const [conversationIds, setConversationIds] = useState<string[]>([]);
  return (
    <>
      <ConversationList
        api={ownerApi}
        onSelectConversation={vi.fn()}
        onShareSelectedConversations={setConversationIds}
      />
      {conversationIds.length > 0 && (
        <ListenOwnerShareDialog
          api={ownerApi}
          tcw={tinyCloud}
          conversationIds={conversationIds}
          onClose={() => setConversationIds([])}
        />
      )}
    </>
  );
}

beforeEach(() => {
  installLocalStorage();
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("listen owner M1-G conformance", () => {
  it("links the real selection UI path to the reviewed owner-share library with exactly selected IDs", async () => {
    const ownerShares = await import("../lib/listenOwnerShares");
    const composeSpy = vi.spyOn(ownerShares, "composeListenOwnerShareDraft");
    const details = {
      "conversation-a": detail("conversation-a", "Planning"),
      "conversation-b": detail("conversation-b", "Retro"),
      "conversation-c": detail("conversation-c", "Ignored"),
    };

    render(<OwnerShareSelectionHarness ownerApi={api(details)} tinyCloud={tcw()} />);

    fireEvent.click(await screen.findByLabelText("Select Planning"));
    fireEvent.click(screen.getByLabelText("Select Retro"));
    fireEvent.click(screen.getByRole("button", { name: "Credentialed share" }));

    expect(
      await screen.findByRole("dialog", { name: /Credentialed transcript share/i }),
    ).toBeInTheDocument();
    await enterEmailDomain();
    await waitFor(() => {
      expect(composeSpy).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          conversationIds: ["conversation-a", "conversation-b"],
          emailDomain: "issuer.credentials.org",
        }),
      );
    });
    const lastCall = composeSpy.mock.calls.at(-1);
    expect(lastCall?.[1].conversationIds).toEqual(["conversation-a", "conversation-b"]);
    expect(lastCall?.[1].conversationIds).not.toContain("conversation-c");
  });

  it("renders disclosure exactly from composed catalog capabilities and states audio is omitted", async () => {
    render(
      <ListenOwnerShareDialog
        api={api({
          "conversation-a": detail("conversation-a", "Catalog Exactness", {
            audio_data_kv_key: "audio/conversation-a/recording",
          }),
        })}
        tcw={tcw()}
        conversationIds={["conversation-a"]}
        onClose={vi.fn()}
      />,
    );

    await enterEmailDomain();
    expect(await screen.findAllByText("Catalog Exactness")).toHaveLength(2);
    expect(
      screen.getByText(`Transcript fields: ${LISTEN_TRANSCRIPT_CONVERSATION_COLUMNS.join(", ")}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Participant fields: ${LISTEN_TRANSCRIPT_PARTICIPANT_COLUMNS.join(", ")}`),
    ).toBeInTheDocument();
    expect(screen.getByText("Transcript body text is included.")).toBeInTheDocument();
    expect(screen.getByText("Audio is not included.")).toBeInTheDocument();
    expect(screen.queryByText(/future transcript/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/suspend|replace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/audio recording|audio file|audio url/i)).not.toBeInTheDocument();
  });

  it("publishes an SDK-composed write-set with refresh-only holder grants and canonical catalog capabilities", async () => {
    const writes: CapturedWrite[] = [];
    const draft = fixedDraft([detail("conversation-a", "Planning")], ["conversation-a"]);

    const published = await publishListenOwnerShare(tcw(writes), draft);

    expect(writes).toHaveLength(4);
    const policy = writeBySuffix(writes, `/policy-${published.policyId}.json`).value;
    const status = writeBySuffix(writes, "/status.json").value;
    const bootstrap = writeBySuffix(writes, "/bootstrap.json").value;
    const engineRecord = writeBySuffix(
      writes,
      `/engine-${published.bootstrap.policyEngine.signedRecord.engineRecordId}.json`,
    ).value;

    expect(policy).toMatchObject({
      policyId: published.policyId,
      ownerDid: "did:pkh:eip155:1:0x0000000000000000000000000000000000000abc",
      createdAt: "2026-05-14T14:00:00Z",
      expiresAt: "2026-06-13T14:00:00Z",
      grant: {
        output: "portable-delegation",
        maxTtlSeconds: 300,
        revocation: "refresh_only",
      },
    });
    expect((policy.grant as { maxTtlSeconds: number }).maxTtlSeconds).toBeLessThanOrEqual(300);
    expect(status).toMatchObject({
      policyId: published.policyId,
      sequence: 1,
      disposition: "active",
      effectiveAt: "2026-05-14T14:00:00Z",
    });
    expect(bootstrap).toMatchObject({
      policyId: published.policyId,
      policyEngine: {
        signedRecord: {
          engineRecordId: published.bootstrap.policyEngine.signedRecord.engineRecordId,
        },
      },
    });
    expect(engineRecord).toMatchObject({
      ownerDid: "did:pkh:eip155:1:0x0000000000000000000000000000000000000abc",
      grantIssuerDid:
        "did:pkh:eip155:1:0x0000000000000000000000000000000000000abc#listen-grant-issuer",
      expiresAt: "2026-06-13T14:00:00Z",
    });
    expect(writes.map((write) => write.path).sort()).toEqual(
      [
        published.policyPath,
        published.engineRecordPath,
        published.statusPath,
        published.bootstrapPath,
      ].sort(),
    );

    const policyCapabilities = (policy.resource as { permissionsCeiling: unknown })
      .permissionsCeiling as ListenOwnerShareDraft["capabilities"];
    expect(policyCapabilities).toEqual(draft.capabilities);
    expect(
      sqlStatements({ ...draft, capabilities: policyCapabilities }).map((item) => item.name),
    ).toEqual(LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES.map((item) => item.name));
    expect(canonicalJson(policyCapabilities)).not.toMatch(/audio|future|suspend|replace/i);
    for (const timestamp of [
      policy.createdAt,
      policy.expiresAt,
      status.effectiveAt,
      engineRecord.expiresAt,
    ]) {
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(new Date(timestamp as string).toISOString().replace(".000Z", "Z")).toBe(timestamp);
    }
  });

  it("revokes with a PolicyStatus write-set, verbatim copy, and an honest revoked projection", async () => {
    const publishWrites: CapturedWrite[] = [];
    const draft = fixedDraft([detail("conversation-a", "Planning")], ["conversation-a"]);
    const published = await publishListenOwnerShare(tcw(publishWrites), draft);
    const revokeWrites: CapturedWrite[] = [];

    const revoked = await revokeListenOwnerShare(tcw(revokeWrites), published);

    expect(revokeWrites).toHaveLength(1);
    expect(revokeWrites[0]?.path).toBe(published.statusPath);
    expect(revokeWrites[0]?.value).toMatchObject({
      policyId: published.policyId,
      sequence: 2,
      disposition: "revoked",
      reasonCode: "owner-revoked",
    });
    expect(revoked.status).toBe("revoked");
    expect(revoked.updatedAt).not.toBe(published.updatedAt);
    expect(REVOKE_COPY).toBe(
      "Access usually ends within 5 minutes. Anything already opened, downloaded, copied, or cached cannot be recalled.",
    );

    render(
      <ListenOwnerShareDialog
        api={api({ "conversation-a": detail("conversation-a", "Planning") })}
        tcw={tcw()}
        conversationIds={["conversation-a"]}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(await enabledPublishButton());
    fireEvent.click(await screen.findByRole("button", { name: /^Revoke access$/i }));
    expect(screen.queryByRole("button", { name: /Confirm revoke/i })).not.toBeInTheDocument();
    expect(await screen.findByText(REVOKE_COPY)).toBeInTheDocument();
  });

  it("makes composition and write-set functions only of the canonical catalog and explicit selection", async () => {
    const selected = ["conversation-a", "conversation-b"];
    const cleanDetails = [
      detail("conversation-a", "Planning"),
      detail("conversation-b", "Retro"),
      detail("conversation-c", "Not Selected"),
    ];
    const adversarialDetails = [
      detail("conversation-a", "Planning", {
        audio: { path: "tinycloud.kv/audio/conversation-a", actions: ["tinycloud.kv/get"] },
        futureTranscripts: true,
        policy: { grant: { revocation: "replace", maxTtlSeconds: 3600 } },
        disclosure: ["include private notes"],
        transcript_text: "poisoned override",
        __proto__: { injected: true },
      }),
      detail("conversation-b", "Retro", {
        capabilityOverrides: LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES.map((statement) => ({
          ...statement,
          sql: "SELECT secret FROM private_table",
        })),
        suspend: true,
        replace: true,
        audioIncluded: true,
      }),
      detail("conversation-c", "Not Selected", {
        selected: true,
        capability: { service: "tinycloud.kv", path: "secret", actions: ["tinycloud.kv/get"] },
      }),
    ];
    const clean = fixedDraft(cleanDetails, selected);
    const adversarial = fixedDraft(adversarialDetails, selected);

    expect(canonicalJson(stableComposition(adversarial))).toBe(
      canonicalJson(stableComposition(clean)),
    );

    const cleanWrites: CapturedWrite[] = [];
    const adversarialWrites: CapturedWrite[] = [];
    await publishListenOwnerShare(tcw(cleanWrites), clean);
    await publishListenOwnerShare(tcw(adversarialWrites), adversarial);
    expect(canonicalJson(adversarialWrites)).toBe(canonicalJson(cleanWrites));
  });
});

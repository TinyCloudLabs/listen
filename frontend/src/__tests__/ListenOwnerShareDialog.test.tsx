import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import type { ApiClient } from "@listen/client";

const ownerShareMocks = vi.hoisted(() => ({
  publishListenOwnerShare: vi.fn(),
  revokeListenOwnerShare: vi.fn(),
}));

vi.mock("../lib/listenShareLinks", () => ({
  hasShareableAudio: (detail: ShareableConversationDetail | null) =>
    Boolean(
      detail &&
      (typeof detail.conversation.metadata.audio_data_kv_key === "string" ||
        typeof detail.conversation.metadata.audio_kv_key === "string"),
    ),
}));

vi.mock("../lib/listenOwnerShares", async () => {
  const REVOKE_COPY =
    "Access usually ends within 5 minutes. Anything already opened, downloaded, copied, or cached cannot be recalled.";
  return {
    OPEN_CREDENTIALS_WITNESS_DID: "did:web:issuer.credentials.org",
    REVOKE_COPY,
    hasListenOwnerShareableAudio: vi.fn(() => false),
    loadOwnerShareDetails: vi.fn(async (api: ApiClient, conversationIds: string[]) =>
      Promise.all(
        conversationIds.map((id) => api.get(`/api/conversations/${encodeURIComponent(id)}`)),
      ),
    ),
    listPublishedListenOwnerShares: vi.fn(() => []),
    composeListenOwnerShareDraft: vi.fn(
      (
        details: ShareableConversationDetail[],
        input: { conversationIds: string[]; emailDomain: string },
      ) => {
        return {
          shareId: "share-1",
          conversationIds: input.conversationIds,
          details,
          capabilities: [],
          disclosure: {
            conversations: input.conversationIds.map((id) => {
              const detail = details.find((item) => item.conversation.id === id)!;
              return {
                conversationId: id,
                title: detail.conversation.title,
                participants: detail.participants.map((participant) =>
                  typeof (participant as { name?: unknown }).name === "string"
                    ? (participant as { name: string }).name
                    : "Participant",
                ),
                transcriptFields: ["id", "title", "transcript_json", "transcript_text"],
                participantFields: ["id", "name", "email", "speaker_label"],
                audioIncluded: false,
              };
            }),
          },
          credentialRule: {
            credentialClass: "w3c.vc/credential/v1",
            credentialType: "opencredentials.email/v1",
            acceptedIssuers: ["did:web:issuer.credentials.org"],
            emailDomains: [input.emailDomain.trim().replace(/^@/, "").toLowerCase()],
          },
          createdAt: "2026-05-14T14:00:00.000Z",
          expiresAt: "2026-06-13T14:00:00.000Z",
        };
      },
    ),
    publishListenOwnerShare: ownerShareMocks.publishListenOwnerShare,
    revokeListenOwnerShare: ownerShareMocks.revokeListenOwnerShare,
  };
});

import { ListenOwnerShareDialog } from "../components/ListenOwnerShareDialog";
import { REVOKE_COPY, type PublishedListenOwnerShare } from "../lib/listenOwnerShares";
import type { ShareableConversationDetail } from "../lib/listenShareLinks";

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

function api(details: Record<string, ShareableConversationDetail>): ApiClient {
  return {
    get: vi.fn(async (path: string) => {
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

function tcw(): TinyCloudWeb {
  return {
    session: () => ({ address: "0xabc123", chainId: 1 }),
    provider: { getSigner: () => ({ signMessage: vi.fn(async () => "0xsignature") }) },
    kv: { put: vi.fn(async () => ({ ok: true })) },
  } as unknown as TinyCloudWeb;
}

function published(overrides: Partial<PublishedListenOwnerShare> = {}): PublishedListenOwnerShare {
  return {
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
    bootstrap: {
      schema: "xyz.tinycloud.exchange/transcript-bootstrap/v0",
      policyId: "pol_1",
      policyEngine: {
        endpoint: "https://node.tinycloud.xyz/policy-engine",
        audience: "urn:tinycloud:policy-engine:listen:m1",
        supportedEvidenceVerifiers: ["w3c.vc/credential/v1"],
        signedRecord: {} as PublishedListenOwnerShare["bootstrap"]["policyEngine"]["signedRecord"],
      },
      resourceHint: { resourceType: "listen-transcript", resourceId: "share-1" },
    },
    policyPath: "xyz.tinycloud.listen/owner-shares/share-1/policy-pol_1.json",
    statusPath: "xyz.tinycloud.listen/owner-shares/share-1/status.json",
    bootstrapPath: "xyz.tinycloud.listen/owner-shares/share-1/bootstrap.json",
    engineRecordPath: "xyz.tinycloud.listen/owner-shares/share-1/engine-peng_1.json",
    ...overrides,
  };
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

beforeEach(() => {
  installLocalStorage();
  window.localStorage.clear();
  ownerShareMocks.publishListenOwnerShare.mockResolvedValue(published());
  ownerShareMocks.revokeListenOwnerShare.mockResolvedValue(published({ status: "revoked" }));
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(async () => undefined) },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ListenOwnerShareDialog", () => {
  it("renders exact selected transcripts without future or collection-growth affordances", async () => {
    render(
      <ListenOwnerShareDialog
        api={api({
          "conversation-a": detail("conversation-a", "Planning"),
          "conversation-b": detail("conversation-b", "Retro"),
        })}
        tcw={tcw()}
        conversationIds={["conversation-a", "conversation-b"]}
        onClose={vi.fn()}
      />,
    );

    await enterEmailDomain();

    expect(await screen.findAllByText("Planning")).toHaveLength(2);
    expect(screen.getAllByText("Retro")).toHaveLength(2);
    expect(screen.getAllByText(/OpenCredentials email credential/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/did:web:issuer.credentials.org/i)).toBeInTheDocument();
    expect(screen.queryByText(/future/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/all future/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/prefix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/collection growth/i)).not.toBeInTheDocument();
  });

  it("derives disclosure from capabilities and states audio is not included", async () => {
    render(
      <ListenOwnerShareDialog
        api={api({
          "conversation-a": detail("conversation-a", "With Audio", {
            audio_data_kv_key: "audio/conversation-a/recording",
            adapter_catalog: { audio: { path: "audio/conversation-a/recording" } },
          }),
          "conversation-b": detail("conversation-b", "No Audio"),
        })}
        tcw={tcw()}
        conversationIds={["conversation-a", "conversation-b"]}
        onClose={vi.fn()}
      />,
    );

    await enterEmailDomain();

    expect(await screen.findAllByText("With Audio")).toHaveLength(2);
    expect(screen.getAllByText(/Participants:/i)[0]).toHaveTextContent("Ada, Grace");
    expect(screen.getAllByText(/Transcript fields:/i)[0]).toHaveTextContent("transcript_json");
    expect(screen.getAllByText(/Participant fields:/i)[0]).toHaveTextContent("speaker_label");
    expect(screen.getAllByText("Audio is not included.")).toHaveLength(2);
    expect(screen.queryByText("Audio recording")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Include KV-backed audio/i)).not.toBeInTheDocument();
  });

  it("shows success only after publish resolves and renders failed publish honestly", async () => {
    render(
      <ListenOwnerShareDialog
        api={api({ "conversation-a": detail("conversation-a", "Planning") })}
        tcw={tcw()}
        conversationIds={["conversation-a"]}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await enabledPublishButton());
    expect(
      await screen.findByText(/Published after all owner-space records were written/i),
    ).toBeInTheDocument();

    cleanup();
    ownerShareMocks.publishListenOwnerShare.mockRejectedValueOnce(new Error("status write failed"));
    render(
      <ListenOwnerShareDialog
        api={api({ "conversation-a": detail("conversation-a", "Planning") })}
        tcw={tcw()}
        conversationIds={["conversation-a"]}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(await enabledPublishButton());
    expect(await screen.findByText(/Share was not published/i)).toBeInTheDocument();
  });

  it("revokes in one tap, disables while pending, and keeps retry on failure", async () => {
    ownerShareMocks.revokeListenOwnerShare.mockRejectedValueOnce(new Error("write failed"));
    render(
      <ListenOwnerShareDialog
        api={api({ "conversation-a": detail("conversation-a", "Planning") })}
        tcw={tcw()}
        conversationIds={["conversation-a"]}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await enabledPublishButton());
    const revokeButton = await screen.findByRole("button", { name: /^Revoke access$/i });
    fireEvent.click(revokeButton);
    await waitFor(() => expect(ownerShareMocks.revokeListenOwnerShare).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: /Confirm revoke/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/This share is still active/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry revoke/i })).toBeInTheDocument();

    ownerShareMocks.revokeListenOwnerShare.mockResolvedValueOnce(published({ status: "revoked" }));
    fireEvent.click(screen.getByRole("button", { name: /Retry revoke/i }));
    expect(await screen.findByText(REVOKE_COPY)).toBeInTheDocument();
  });
});

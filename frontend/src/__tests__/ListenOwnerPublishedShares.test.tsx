import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

import { ListenOwnerPublishedShares } from "../components/ListenOwnerPublishedShares";
import {
  composeListenOwnerShareDraft,
  publishListenOwnerShare,
  REVOKE_COPY,
} from "../lib/listenOwnerShares";
import type { ShareableConversationDetail } from "../lib/listenShareLinks";

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

function detail(id: string, title: string): ShareableConversationDetail {
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
      metadata: {},
      transcript_json: [{ speaker: "Ada", text: "Hello" }],
      created_at: "2026-05-14T14:00:00Z",
      updated_at: "2026-05-14T14:00:00Z",
    },
    participants: [{ id: "p1", name: "Ada", email: "ada@example.com", speaker_label: "Speaker 1" }],
    transcript: [{ speakerName: "Ada", text: "Hello", startTime: 0, endTime: 1 }],
  };
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

async function publishStoredShare() {
  const draft = {
    ...composeListenOwnerShareDraft([detail("conversation-a", "Planning")], {
      conversationIds: ["conversation-a"],
      emailDomain: "issuer.credentials.org",
      createdAt: "2026-05-14T14:00:00Z",
      expiresAt: "2026-06-13T14:00:00Z",
    }),
    shareId: "share-1",
  };
  return publishListenOwnerShare(tcw(), draft);
}

beforeEach(() => {
  installLocalStorage();
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("ListenOwnerPublishedShares", () => {
  it("renders a published share after remount and revokes with one tap after transport confirmation", async () => {
    const put = vi.fn(async () => ({ ok: true }));
    await publishStoredShare();
    cleanup();

    render(<ListenOwnerPublishedShares tcw={tcw(put)} />);

    expect(await screen.findByText("Published credentialed shares")).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Revoke access$/i }));
    expect(screen.queryByRole("button", { name: /Confirm revoke/i })).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/revoked/i)).toBeInTheDocument());
    expect(screen.getByText(REVOKE_COPY)).toBeInTheDocument();
  });

  it("disables the revoke button while revocation is pending", async () => {
    await publishStoredShare();
    let resolvePut: (value: { ok: true }) => void = () => undefined;
    const put = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolvePut = resolve;
        }),
    );

    render(<ListenOwnerPublishedShares tcw={tcw(put)} />);

    const revokeButton = await screen.findByRole("button", { name: /^Revoke access$/i });
    fireEvent.click(revokeButton);
    expect(revokeButton).toBeDisabled();
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    resolvePut({ ok: true });
    await waitFor(() => expect(screen.getByText(REVOKE_COPY)).toBeInTheDocument());
  });

  it("keeps a failed revoke active with a retry affordance", async () => {
    await publishStoredShare();
    const put = vi.fn(async () => ({ ok: false, error: { message: "status write failed" } }));

    render(<ListenOwnerPublishedShares tcw={tcw(put)} />);

    fireEvent.click(await screen.findByRole("button", { name: /^Revoke access$/i }));

    expect(await screen.findByText(/This share is still active/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Revoke access$/i })).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
  });

  it("quarantines malformed stored records and exposes no revoke authority", async () => {
    const share = await publishStoredShare();
    window.localStorage.setItem(
      "listen:owner-transcript-shares:v1",
      JSON.stringify([{ ...share, unexpected: true }]),
    );
    const put = vi.fn(async () => ({ ok: true }));

    render(<ListenOwnerPublishedShares tcw={tcw(put)} />);

    expect(screen.getByText(/share history is quarantined/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revoke/i })).not.toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it("quarantines tampered persisted revoke coordinates before transport is reachable", async () => {
    const share = await publishStoredShare();
    window.localStorage.setItem(
      "listen:owner-transcript-shares:v1",
      JSON.stringify([
        {
          ...share,
          statusPath: "xyz.tinycloud.listen/owner-shares/other-share/status.json",
        },
      ]),
    );
    const put = vi.fn(async () => ({ ok: true }));

    render(<ListenOwnerPublishedShares tcw={tcw(put)} />);

    expect(screen.getByText(/share history is quarantined/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revoke/i })).not.toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });
});

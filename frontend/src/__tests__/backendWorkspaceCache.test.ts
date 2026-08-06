import { describe, expect, it, beforeEach } from "vitest";
import type { WorkspaceStateResponse } from "@listen/core";
import {
  backendWorkspaceCacheKey,
  readBackendWorkspaceCache,
  workspaceStateFromCache,
  writeBackendWorkspaceCache,
} from "../lib/backendWorkspaceCache";

const ADDRESS = "0xabc123";
const BACKEND_DID = "did:key:backend";
const EXPIRES_AT = new Date(Date.now() + 3_600_000).toISOString();

function workspaceState(
  activation: WorkspaceStateResponse["delegation"]["activation"],
): WorkspaceStateResponse {
  return {
    delegation: {
      status: "active",
      stored: true,
      validPolicy: true,
      expiresAt: EXPIRES_AT,
      activation,
    },
    backendReadableSecrets: {
      fireflies: { readable: false },
      granola: { readable: false },
      soundcoreSession: { readable: false },
      soundcoreAuthToken: { readable: false },
      soundcoreUid: { readable: false },
      soundcoreOpenudid: { readable: false },
      assemblyai: { readable: false },
      deepgram: { readable: false },
    },
    googleMeet: { available: false, connected: false },
    conversations: { hasAny: false, total: 0 },
  };
}

describe("backend workspace cache", () => {
  beforeEach(() => localStorage.clear());

  it.each(["pending", "failed"] as const)("does not cache %s activation as ready", (activation) => {
    writeBackendWorkspaceCache(ADDRESS, BACKEND_DID, workspaceState(activation));

    expect(readBackendWorkspaceCache(ADDRESS, BACKEND_DID)).toBeNull();
  });

  it("stores and reconstructs only authoritative active activation", () => {
    writeBackendWorkspaceCache(ADDRESS, BACKEND_DID, workspaceState("active"));

    const cached = readBackendWorkspaceCache(ADDRESS, BACKEND_DID);
    expect(cached?.activation).toBe("active");
    expect(workspaceStateFromCache(cached!)).toMatchObject({
      delegation: { status: "active", activation: "active" },
    });
  });

  it("preserves proven conversation existence when a later write is unknown", () => {
    writeBackendWorkspaceCache(ADDRESS, BACKEND_DID, {
      ...workspaceState("active"),
      conversations: { hasAny: true, total: 4 },
    });
    writeBackendWorkspaceCache(ADDRESS, BACKEND_DID, {
      ...workspaceState("active"),
      conversations: { hasAny: null, total: null },
    });

    expect(readBackendWorkspaceCache(ADDRESS, BACKEND_DID)?.conversations).toEqual({
      hasAny: true,
      total: 4,
    });
  });

  it("rejects a non-authoritative activation persisted by an older writer", () => {
    localStorage.setItem(
      backendWorkspaceCacheKey(ADDRESS, BACKEND_DID),
      JSON.stringify({
        version: 2,
        address: ADDRESS,
        backendDid: BACKEND_DID,
        cachedAt: new Date().toISOString(),
        expiresAt: EXPIRES_AT,
        activation: "pending",
        ...workspaceState("pending"),
      }),
    );

    expect(readBackendWorkspaceCache(ADDRESS, BACKEND_DID)).toBeNull();
  });
});

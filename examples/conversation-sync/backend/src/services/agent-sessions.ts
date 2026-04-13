import type { DelegatedAccess } from "@tinyboilerplate/server";

// ── Types ────────────────────────────────────────────────────────────

/**
 * Narrow interface over a session-only TinyCloudNode. The default
 * implementation wraps `new TinyCloudNode()` via a dynamic import;
 * tests inject a stub so they don't need the real WASM runtime.
 */
export interface AgentNodeHandle {
  /** The session key DID (did:key:z6Mk…) — the delegation target. */
  did: string;
  /** Activate a serialized PortableDelegation granted to this node's DID. */
  useDelegation(serialized: string): Promise<DelegatedAccess>;
}

export type CreateAgentNode = () => Promise<AgentNodeHandle>;

export interface AgentSessionEntry {
  userAddress: string;
  agentId: string;
  nodeHandle: AgentNodeHandle;
  /** Activated DelegatedAccess — set once the user POSTs /delegation. */
  access: DelegatedAccess | null;
  expiresAt: number;
  createdAt: number;
}

export interface AgentSessionStoreConfig {
  ttlMs?: number;
  createAgentNode?: CreateAgentNode;
  sweepIntervalMs?: number;
}

// ── Default node factory ─────────────────────────────────────────────

/**
 * Default AgentNodeHandle factory — wraps a fresh session-only
 * TinyCloudNode. The import is dynamic because `@tinycloud/node-sdk`
 * pulls in the WASM runtime + ESM shims, which is heavyweight and
 * shouldn't load in unit-test environments that don't exercise this.
 */
async function defaultCreateAgentNode(): Promise<AgentNodeHandle> {
  const sdk = await import("@tinycloud/node-sdk");
  const node = new sdk.TinyCloudNode();
  return {
    did: node.did,
    async useDelegation(serialized: string) {
      const delegation = sdk.deserializeDelegation(serialized);
      return node.useDelegation(delegation);
    },
  };
}

// ── Errors ───────────────────────────────────────────────────────────

/**
 * Thrown when a caller tries to use agent-session state that doesn't
 * exist or is not yet activated. Routers catch this and translate to
 * HTTP 409 so the frontend can re-open the session.
 */
export class AgentSessionError extends Error {
  constructor(
    public readonly code: "no_agent_session" | "no_agent_delegation" | "agent_session_expired",
    message: string,
  ) {
    super(message);
    this.name = "AgentSessionError";
  }
}

// ── Store ────────────────────────────────────────────────────────────

/**
 * In-memory map of (userAddress, agentId) → ephemeral agent session.
 *
 * Each entry owns a fresh session-only TinyCloudNode (its own keypair
 * and did:key). The user signs a short-lived PortableDelegation to that
 * DID from the browser; activating it on the entry produces a
 * DelegatedAccess scoped to the agent's own identity, not the user's
 * main backend delegation.
 *
 * Entries expire after `ttlMs` (default 1 hour). Expired entries are
 * swept every `sweepIntervalMs` (default 5 minutes).
 */
export class AgentSessionStore {
  private readonly entries = new Map<string, AgentSessionEntry>();
  private readonly ttlMs: number;
  private readonly createAgentNode: CreateAgentNode;
  private readonly sweepIntervalMs: number;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: AgentSessionStoreConfig = {}) {
    this.ttlMs = config.ttlMs ?? 60 * 60 * 1000; // 1h
    this.createAgentNode = config.createAgentNode ?? defaultCreateAgentNode;
    this.sweepIntervalMs = config.sweepIntervalMs ?? 5 * 60 * 1000; // 5m
  }

  private keyFor(userAddress: string, agentId: string): string {
    return `${userAddress.toLowerCase()}|${agentId}`;
  }

  /**
   * Open a fresh agent session. Generates a new keypair inside a
   * session-only TinyCloudNode and returns the entry. Any prior
   * session for the same (user, agent) pair is replaced — a second
   * `openSession` call explicitly means "start over with a new
   * ephemeral identity".
   */
  async openSession(userAddress: string, agentId: string): Promise<AgentSessionEntry> {
    const nodeHandle = await this.createAgentNode();
    const now = Date.now();
    const entry: AgentSessionEntry = {
      userAddress,
      agentId,
      nodeHandle,
      access: null,
      expiresAt: now + this.ttlMs,
      createdAt: now,
    };
    this.entries.set(this.keyFor(userAddress, agentId), entry);
    return entry;
  }

  /**
   * Activate a serialized PortableDelegation on an existing session.
   * The delegation must target the session's node DID — this is
   * enforced by the TinyCloudNode layer, which will throw if the
   * delegateDID doesn't match its session key.
   */
  async activateDelegation(
    userAddress: string,
    agentId: string,
    serialized: string,
  ): Promise<AgentSessionEntry> {
    const entry = this.peek(userAddress, agentId);
    if (!entry) {
      throw new AgentSessionError(
        "no_agent_session",
        `No active agent session for agent ${agentId}. POST /session first.`,
      );
    }
    entry.access = await entry.nodeHandle.useDelegation(serialized);
    return entry;
  }

  /**
   * Return the entry for (user, agent) without enforcing
   * activation. Null if missing or expired.
   */
  peek(userAddress: string, agentId: string): AgentSessionEntry | null {
    const key = this.keyFor(userAddress, agentId);
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry;
  }

  /**
   * Return the activated DelegatedAccess for (user, agent). Throws
   * AgentSessionError if the session is missing, expired, or has no
   * active delegation yet. Callers (route handlers) should translate
   * to HTTP 409 so the frontend knows to re-run the session handshake.
   */
  requireAccess(userAddress: string, agentId: string): DelegatedAccess {
    const key = this.keyFor(userAddress, agentId);
    const entry = this.entries.get(key);
    if (!entry) {
      throw new AgentSessionError(
        "no_agent_session",
        `No active agent session for agent ${agentId}.`,
      );
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      throw new AgentSessionError(
        "agent_session_expired",
        `Agent session for ${agentId} has expired.`,
      );
    }
    if (!entry.access) {
      throw new AgentSessionError(
        "no_agent_delegation",
        `Agent session for ${agentId} has no active delegation.`,
      );
    }
    return entry.access;
  }

  /** Evict a session explicitly (e.g. on agent delete). */
  evict(userAddress: string, agentId: string): void {
    this.entries.delete(this.keyFor(userAddress, agentId));
  }

  /** Current entry count — exposed for tests + observability. */
  size(): number {
    return this.entries.size;
  }

  /**
   * Start the background sweeper that evicts expired entries. Safe to
   * call multiple times — noop if already running.
   */
  startSweeper(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.entries) {
        if (entry.expiresAt <= now) this.entries.delete(key);
      }
    }, this.sweepIntervalMs);
    // Don't hold the event loop open just for the sweeper.
    const timer = this.sweepTimer as unknown as { unref?: () => void };
    timer.unref?.();
  }

  stopSweeper(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }
}

#!/usr/bin/env bun
/**
 * delegation-endpoint: activation sidecar for the tc-agent Docker image.
 *
 * On POST /delegation (from the app's Connect Agent dialog):
 *   1. Deserialize the PortableDelegation.
 *   2. Activate it with the persisted agent wallet key via
 *      node.useDelegation(), producing a DelegatedAccess bound to a fresh
 *      server-side session key (~1h TTL in wallet mode).
 *   3. Project that session's handles via the RestorableSession shape and
 *      write a tc-compatible profile to /root/.tinycloud/profiles/default/.
 *   4. Start (or re-seed) a 25-min background refresh loop that re-runs
 *      useDelegation + rewrites session.json before the server-side session
 *      expires.
 *
 * This lets the official @tinycloud/cli (binary `tc`) operate on the
 * delegator's space as if logged in — no tc knowledge of delegations.
 *
 * Persistent state under DELEGATION_SIDECAR_DIR:
 *   agent-key.json      — { privateKey: "0x..." } — the stable agent wallet
 *   delegation.json     — last-POSTed serialized PortableDelegation (for refresh)
 *
 * State derived from the above lives under /root/.tinycloud/ and is
 * regenerated on each refresh.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  TinyCloudNode,
  PrivateKeySigner,
  deserializeDelegation,
  type DelegatedAccess,
  type PortableDelegation,
} from "@tinycloud/node-sdk";

import { ensureAgentKey } from "./agent-key.js";
import {
  clearSession,
  extractRestorable,
  writeInitialProfile,
  writeSessionOnly,
} from "./profile-writer.js";
import { RefreshLoop } from "./refresh-loop.js";

// ── Config ────────────────────────────────────────────────────────────

const PORT = Number(process.env.DELEGATION_ENDPOINT_PORT ?? 4097);
const HOST = process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz";
const SIDECAR_DIR = process.env.DELEGATION_SIDECAR_DIR ?? "/var/lib/delegation-endpoint";
const TC_PROFILES_ROOT = process.env.TC_PROFILES_ROOT ?? "/root/.tinycloud";
const TC_PROFILE_NAME = process.env.TC_PROFILE_NAME ?? "default";
const REFRESH_INTERVAL_MS = Number(process.env.REFRESH_INTERVAL_MS ?? 25 * 60 * 1000);

// Persistent state inside the sidecar volume. The Layer-1 image wrote
// `delegation.txt` (plain text) to the same volume root; we read that as a
// fallback so a pre-existing named volume carries forward without a DID reset.
const AGENT_KEY_PATH = join(SIDECAR_DIR, "agent-key.json");
const DELEGATION_PATH = join(SIDECAR_DIR, "delegation.json");
const LEGACY_DELEGATION_PATH = join(SIDECAR_DIR, "delegation.txt");

// ── CORS ──────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "600",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ── Sidecar state ─────────────────────────────────────────────────────

interface SidecarState {
  node: TinyCloudNode;
  agentAddress: string;
  agentDid: string;
  currentDelegation: PortableDelegation | null;
  refreshLoop: RefreshLoop;
  lastGrantAt: number | null;
  lastError: string | null;
}

function loadPersistedDelegation(): string | null {
  if (existsSync(DELEGATION_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(DELEGATION_PATH, "utf-8")) as { serialized?: string };
      if (typeof parsed.serialized === "string" && parsed.serialized.length > 0) {
        return parsed.serialized;
      }
    } catch {
      // Fall through to legacy check.
    }
  }
  if (existsSync(LEGACY_DELEGATION_PATH)) {
    const legacy = readFileSync(LEGACY_DELEGATION_PATH, "utf-8").trim();
    if (legacy.length > 0) {
      persistDelegation(legacy);
      return legacy;
    }
  }
  return null;
}

function persistDelegation(serialized: string): void {
  mkdirSync(SIDECAR_DIR, { recursive: true });
  writeFileSync(DELEGATION_PATH, JSON.stringify({ serialized }, null, 2) + "\n", "utf-8");
}

async function activateAndWrite(
  state: SidecarState,
  delegation: PortableDelegation,
  initial: boolean,
): Promise<void> {
  const access: DelegatedAccess = await state.node.useDelegation(delegation);
  const restorable = extractRestorable(access);

  const input = {
    profilesRoot: TC_PROFILES_ROOT,
    profileName: TC_PROFILE_NAME,
    host: HOST,
    agentAddress: state.agentAddress,
    delegation,
    restorable,
  };

  if (initial) {
    writeInitialProfile(input);
  } else {
    writeSessionOnly(input);
  }
}

async function bootstrap(): Promise<SidecarState> {
  mkdirSync(SIDECAR_DIR, { recursive: true });

  const { key, generated } = ensureAgentKey({
    primaryPath: AGENT_KEY_PATH,
  });

  const agentAddress = await new PrivateKeySigner(key.privateKey).getAddress();
  const agentDid = `did:pkh:eip155:1:${agentAddress}`;

  if (generated) console.log(`[sidecar] generated new agent key at ${AGENT_KEY_PATH}`);

  const node = new TinyCloudNode({
    privateKey: key.privateKey,
    host: HOST,
    prefix: process.env.TC_AGENT_PREFIX ?? "tc-agent",
    autoCreateSpace: false,
  });
  await node.signIn();

  const state: SidecarState = {
    node,
    agentAddress,
    agentDid,
    currentDelegation: null,
    lastGrantAt: null,
    lastError: null,
    refreshLoop: null as unknown as RefreshLoop,
  };

  state.refreshLoop = new RefreshLoop({
    intervalMs: REFRESH_INTERVAL_MS,
    refresh: async () => {
      if (!state.currentDelegation) return; // nothing to refresh yet
      await activateAndWrite(state, state.currentDelegation, false);
    },
    onSuccess: () => {
      state.lastError = null;
    },
    onTransientFailure: (err, attempt) => {
      state.lastError = `transient (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[sidecar] refresh transient failure:`, err);
    },
    onTerminalFailure: (err) => {
      state.lastError = `terminal: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[sidecar] refresh terminal failure — clearing session:`, err);
      clearSession(TC_PROFILES_ROOT, TC_PROFILE_NAME);
    },
  });

  const serialized = loadPersistedDelegation();
  if (serialized) {
    try {
      const delegation = deserializeDelegation(serialized);
      state.currentDelegation = delegation;
      await activateAndWrite(state, delegation, true);
      state.lastGrantAt = Date.now();
      console.log(`[sidecar] restored delegation from disk (cid=${delegation.cid})`);
    } catch (err) {
      state.lastError = `restore: ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[sidecar] failed to restore persisted delegation:`, err);
    }
  }

  state.refreshLoop.start();

  printDidBanner(agentDid);

  return state;
}

function printDidBanner(agentDid: string): void {
  console.log("");
  console.log("==================================================================");
  console.log(`  Agent DID: ${agentDid}`);
  console.log("");
  console.log("  Copy this DID into the 'Connect Agent' dialog in your app UI.");
  console.log("  OpenCode web UI: http://localhost:4096");
  console.log("==================================================================");
  console.log("");
}

// ── HTTP ──────────────────────────────────────────────────────────────

async function handlePostDelegation(req: Request, state: SidecarState): Promise<Response> {
  let body: { serialized?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: "invalid_json", message: "Body must be JSON." } });
  }

  const serialized = body?.serialized;
  if (typeof serialized !== "string" || serialized.length === 0) {
    return json(400, {
      error: { code: "invalid_body", message: "Body must be { serialized: string } (non-empty)." },
    });
  }

  let delegation: PortableDelegation;
  try {
    delegation = deserializeDelegation(serialized);
  } catch (err) {
    return json(400, {
      error: {
        code: "invalid_delegation",
        message: err instanceof Error ? err.message : String(err),
      },
    });
  }

  if (typeof delegation.chainId !== "number" || !Number.isFinite(delegation.chainId)) {
    return json(400, {
      error: { code: "invalid_delegation", message: "Delegation is missing chainId." },
    });
  }

  try {
    await activateAndWrite(state, delegation, true);
    state.currentDelegation = delegation;
    state.lastGrantAt = Date.now();
    state.lastError = null;
    persistDelegation(serialized);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    state.lastError = `grant: ${message}`;
    console.error(`[sidecar] activation failed on POST /delegation:`, err);
    return json(500, { error: { code: "activation_failed", message } });
  }

  console.log(
    `[sidecar] activated delegation cid=${delegation.cid} space=${delegation.spaceId} — tc profile written`,
  );
  return json(200, {
    ok: true,
    agentDid: state.agentDid,
    delegationCid: delegation.cid,
    spaceId: delegation.spaceId,
  });
}

async function handlePostRefresh(state: SidecarState): Promise<Response> {
  if (!state.currentDelegation) {
    return json(409, {
      error: { code: "no_delegation", message: "No delegation has been granted yet." },
    });
  }
  try {
    await state.refreshLoop.runNow();
    return json(200, { ok: true, state: state.refreshLoop.getState() });
  } catch (err) {
    return json(500, {
      error: {
        code: "refresh_failed",
        message: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

function handleGetHealth(state: SidecarState): Response {
  return json(200, {
    ok: state.lastError == null,
    agentDid: state.agentDid,
    hasDelegation: state.currentDelegation !== null,
    lastGrantAt: state.lastGrantAt,
    lastError: state.lastError,
    refresh: state.refreshLoop.getState(),
  });
}

// ── Boot ──────────────────────────────────────────────────────────────

bootstrap()
  .then((state) => {
    Bun.serve({
      port: PORT,
      hostname: "0.0.0.0",
      async fetch(req) {
        const url = new URL(req.url);

        if (req.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }
        if (url.pathname === "/delegation" && req.method === "POST") {
          return handlePostDelegation(req, state);
        }
        if (url.pathname === "/refresh" && req.method === "POST") {
          return handlePostRefresh(state);
        }
        if (url.pathname === "/health" && req.method === "GET") {
          return handleGetHealth(state);
        }
        return json(404, {
          error: { code: "not_found", message: `${req.method} ${url.pathname}` },
        });
      },
    });
    console.log(
      `[sidecar] listening on 0.0.0.0:${PORT} — profiles=${TC_PROFILES_ROOT}/profiles/${TC_PROFILE_NAME}/`,
    );
  })
  .catch((err) => {
    console.error("[sidecar] bootstrap failed:", err);
    process.exit(1);
  });

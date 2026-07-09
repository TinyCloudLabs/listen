import { Router } from "express";
import type { Request, RequestHandler } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import type { DelegationCache, DelegationStore } from "@listen/server";
import type { WorkspaceStateResponse, WorkspaceSecretKey } from "@listen/core";
import { backendDelegationPolicyHash, ownerDidFromAddress } from "../manifest.js";
import {
  activatePortableDelegation,
  deserializePortableDelegationSet,
} from "../delegation-activation.js";
import { withTimeout } from "../middleware/timeout.js";
import { conversationSql } from "../schema.js";
import { googleTokensExist } from "../services/google-tokens.js";

interface WorkspaceStateRoutesConfig {
  node: TinyCloudNode;
  did: string;
  store: DelegationStore;
  cache: DelegationCache;
  authMiddleware: RequestHandler;
}

const ACTIVATION_TIMEOUT_MS = 5_000;

// `readable` is an existence/READ hint from the backend's delegated view;
// decryptability of the payload is not re-verified on every request, and results
// may be up to WORKSPACE_SECRETS_CACHE_MS stale. The UI treats this as a hint only.
// Bottom of the 2–5 min allowed range because Batch A's onboarding gate consumes
// this hint — a stale readable:false right after connecting a source is the risk to
// minimize. Key saves bust the entry (see bustWorkspaceSecretsCache) and callers can
// force a fresh probe with ?fresh=1.
export const WORKSPACE_SECRETS_CACHE_MS = 2 * 60 * 1000;
const WORKSPACE_SECRETS_CACHE_MAX = 1000;

const workspaceSecretsCache = new Map<
  string,
  { at: number; value: WorkspaceStateResponse["backendReadableSecrets"] }
>();

/** Invalidate the cached secret-readability hint for an address (call on key save). */
export function bustWorkspaceSecretsCache(address: string): void {
  workspaceSecretsCache.delete(address.toLowerCase());
}

const WORKSPACE_SECRET_NAMES: Record<WorkspaceSecretKey, string> = {
  fireflies: "FIREFLIES_API_KEY",
  granola: "GRANOLA_API_KEY",
  soundcoreSession: "SOUNDCORE_SESSION",
  soundcoreAuthToken: "SOUNDCORE_AUTH_TOKEN",
  soundcoreUid: "SOUNDCORE_UID",
  soundcoreOpenudid: "SOUNDCORE_OPENUDID",
  assemblyai: "ASSEMBLYAI_API_KEY",
  deepgram: "DEEPGRAM_API_KEY",
};

type DelegatedAccess = NonNullable<Request["delegatedAccess"]>;

export function createWorkspaceStateRouter(config: WorkspaceStateRoutesConfig) {
  const { node, store, cache, authMiddleware } = config;
  const router = Router();

  router.use(authMiddleware);

  router.get("/", async (req: Request, res) => {
    if (!req.user) {
      res.status(401).json({ error: "unauthenticated", message: "Authentication required" });
      return;
    }

    const { address } = req.user;
    const ownerDid = ownerDidFromAddress(address);
    const fresh = req.query.fresh === "1";
    const base: WorkspaceStateResponse = {
      delegation: {
        status: "none",
        stored: false,
        validPolicy: false,
        expiresAt: null,
        activation: "unknown",
      },
      backendReadableSecrets: {
        fireflies: { readable: null },
        granola: { readable: null },
        soundcoreSession: { readable: null },
        soundcoreAuthToken: { readable: null },
        soundcoreUid: { readable: null },
        soundcoreOpenudid: { readable: null },
        assemblyai: { readable: null },
        deepgram: { readable: null },
      },
      googleMeet: {
        available: Boolean(process.env.GOOGLE_CLIENT_ID),
        connected: null,
      },
      conversations: {
        hasAny: null,
        total: null,
      },
    };

    try {
      const stored = await store.load(address);
      if (!stored) {
        res.json(base);
        return;
      }

      if (new Date(stored.expiresAt).getTime() <= Date.now()) {
        await store.remove(address);
        cache.evict(address);
        res.json({
          ...base,
          delegation: {
            status: "expired",
            stored: false,
            validPolicy: false,
            expiresAt: stored.expiresAt,
            activation: "unknown",
          },
        } satisfies WorkspaceStateResponse);
        return;
      }

      const validPolicy = stored.policyHash === backendDelegationPolicyHash(config.did, ownerDid);
      if (!validPolicy) {
        await store.remove(address);
        cache.evict(address);
        res.json({
          ...base,
          delegation: {
            status: "stale",
            stored: false,
            validPolicy: false,
            expiresAt: stored.expiresAt,
            activation: "unknown",
          },
        } satisfies WorkspaceStateResponse);
        return;
      }

      let access = cache.get(address) as DelegatedAccess | null;
      let activation: WorkspaceStateResponse["delegation"]["activation"] = access
        ? "active"
        : "pending";
      let activationError: string | undefined;

      if (!access) {
        try {
          const delegation = deserializePortableDelegationSet(stored.serialized);
          access = await withTimeout(
            activatePortableDelegation(node, delegation) as Promise<DelegatedAccess>,
            ACTIVATION_TIMEOUT_MS,
          );
          cache.set(address, access, {
            expiresAt: stored.expiresAt,
            policyHash: stored.policyHash,
          });
          activation = "active";
        } catch (err) {
          activation = "failed";
          activationError = err instanceof Error ? err.message : String(err);
        }
      }

      const response: WorkspaceStateResponse = {
        ...base,
        delegation: {
          status: "active",
          stored: true,
          validPolicy: true,
          expiresAt: stored.expiresAt,
          activation,
          ...(activationError ? { error: activationError } : {}),
        },
      };

      if (!access) {
        res.json(response);
        return;
      }

      const [secrets, googleMeet, conversations] = await Promise.all([
        readBackendSecrets(address, access, fresh),
        readGoogleMeetState(access),
        readConversationState(access),
      ]);

      res.json({
        ...response,
        backendReadableSecrets: secrets,
        googleMeet: {
          ...response.googleMeet,
          ...googleMeet,
        },
        conversations,
      } satisfies WorkspaceStateResponse);
    } catch (err) {
      console.error("[workspace-state] failed to load workspace state:", err);
      res.status(500).json({
        error: "workspace_state_failed",
        message: "Failed to load workspace state",
      });
    }
  });

  return router;
}

async function readBackendSecrets(
  address: string,
  access: DelegatedAccess,
  fresh: boolean,
): Promise<WorkspaceStateResponse["backendReadableSecrets"]> {
  const cacheKey = address.toLowerCase();
  if (!fresh) {
    const cached = workspaceSecretsCache.get(cacheKey);
    if (cached && Date.now() - cached.at < WORKSPACE_SECRETS_CACHE_MS) {
      return cached.value;
    }
  }

  const entries = await Promise.all(
    (Object.keys(WORKSPACE_SECRET_NAMES) as WorkspaceSecretKey[]).map(async (key) => {
      const result = await readSecret(access, WORKSPACE_SECRET_NAMES[key]);
      return [key, result] as const;
    }),
  );

  const value = Object.fromEntries(entries) as WorkspaceStateResponse["backendReadableSecrets"];

  // Bounded LRU (delete + re-insert to move to end; evict oldest over cap).
  workspaceSecretsCache.delete(cacheKey);
  if (workspaceSecretsCache.size >= WORKSPACE_SECRETS_CACHE_MAX) {
    const oldest = workspaceSecretsCache.keys().next().value;
    if (oldest !== undefined) workspaceSecretsCache.delete(oldest);
  }
  workspaceSecretsCache.set(cacheKey, { at: Date.now(), value });

  return value;
}

async function readSecret(
  access: DelegatedAccess,
  secretName: string,
): Promise<{ readable: boolean | null; error?: string }> {
  if (!access.secrets?.get) {
    return { readable: false, error: "missing_secret_access" };
  }

  try {
    const result = await access.secrets.get(secretName);
    if (result.ok) return { readable: true };

    const code = result.error?.code?.toLowerCase();
    if (code === "key_not_found" || code === "not_found" || code === "grant_not_found") {
      return { readable: false };
    }

    return {
      readable: null,
      error: result.error?.message ?? result.error?.code ?? "secret_check_failed",
    };
  } catch (err) {
    return { readable: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function readGoogleMeetState(
  access: DelegatedAccess,
): Promise<Pick<WorkspaceStateResponse["googleMeet"], "connected">> {
  try {
    return { connected: await googleTokensExist(access) };
  } catch {
    return { connected: null };
  }
}

async function readConversationState(
  access: DelegatedAccess,
): Promise<WorkspaceStateResponse["conversations"]> {
  try {
    const sqlDb = conversationSql(access);
    const result = await sqlDb.query("SELECT COUNT(*) AS total FROM conversation");
    if (!result.ok || !result.data.rows?.[0]) return { hasAny: null, total: null };

    const row = result.data.rows[0] as unknown[] | Record<string, unknown>;
    const total = Array.isArray(row) ? Number(row[0]) || 0 : Number(row.total) || 0;
    return { hasAny: total > 0, total };
  } catch {
    return { hasAny: null, total: null };
  }
}

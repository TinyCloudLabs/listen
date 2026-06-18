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

interface WorkspaceStateRoutesConfig {
  node: TinyCloudNode;
  did: string;
  store: DelegationStore;
  cache: DelegationCache;
  authMiddleware: RequestHandler;
}

const ACTIVATION_TIMEOUT_MS = 5_000;
const GOOGLE_TOKENS_PATH = "config/google-tokens";
const WORKSPACE_SECRET_NAMES: Record<WorkspaceSecretKey, string> = {
  fireflies: "FIREFLIES_API_KEY",
  granola: "GRANOLA_API_KEY",
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
          cache.set(address, access);
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
        readBackendSecrets(access),
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
  access: DelegatedAccess,
): Promise<WorkspaceStateResponse["backendReadableSecrets"]> {
  const entries = await Promise.all(
    (Object.keys(WORKSPACE_SECRET_NAMES) as WorkspaceSecretKey[]).map(async (key) => {
      const result = await readSecret(access, WORKSPACE_SECRET_NAMES[key]);
      return [key, result] as const;
    }),
  );

  return Object.fromEntries(entries) as WorkspaceStateResponse["backendReadableSecrets"];
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
    const result = await access.kv.get(GOOGLE_TOKENS_PATH);
    if (!result.ok) {
      const code = result.error?.code;
      if (code === "KV_NOT_FOUND") return { connected: false };
      return { connected: null };
    }

    return { connected: result.data?.data != null };
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

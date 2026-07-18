import { Router } from "express";
import type { Request, RequestHandler } from "express";
import type { DelegationCache, DelegationStore } from "@listen/server";
import type { WorkspaceStateResponse, WorkspaceSecretKey } from "@listen/core";
import { backendDelegationPolicyHash, ownerDidFromAddress } from "../manifest.js";
import type { DelegationActivator } from "../delegation-activation.js";
import { TinyCloudOperationTimeoutError, withTimeout } from "../middleware/timeout.js";
import { conversationSql } from "../schema.js";
import { googleTokensExist } from "../services/google-tokens.js";

interface WorkspaceStateRoutesConfig {
  did: string;
  store: DelegationStore;
  cache: DelegationCache;
  activator: DelegationActivator;
  authMiddleware: RequestHandler;
  activationTimeoutMs?: number;
}

const ACTIVATION_TIMEOUT_MS = 45_000;
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
  const { store, cache, activator, authMiddleware } = config;
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
        activator.invalidate(address);
        await store.remove(address);
        activator.invalidate(address);
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
        activator.invalidate(address);
        await store.remove(address);
        activator.invalidate(address);
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
          access = await withTimeout(
            activator.activate(address, stored.serialized) as Promise<DelegatedAccess>,
            config.activationTimeoutMs ?? ACTIVATION_TIMEOUT_MS,
          );
          activation = "active";
        } catch (err) {
          if (err instanceof TinyCloudOperationTimeoutError) {
            activation = "pending";
          } else {
            activation = "failed";
            activationError = err instanceof Error ? err.message : String(err);
          }
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

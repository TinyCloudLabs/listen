import { Router } from "express";
import type { Request, RequestHandler } from "express";
import type { DelegationCache, DelegationStore } from "@listen/server";
import type { WorkspaceStateResponse, WorkspaceSecretKey } from "@listen/core";
import { backendDelegationPolicyHash, ownerDidFromAddress } from "../manifest.js";
import type { DelegationActivator } from "../delegation-activation.js";
import { createDelegationResolver } from "../delegation-resolver.js";
import { conversationSql } from "../schema.js";
import { googleTokensExist } from "../services/google-tokens.js";
import { readSourceApiKeyResult } from "../services/source-secret.js";

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
  const resolver = createDelegationResolver({
    store,
    cache,
    activator,
    policyHashForAddress: (address) =>
      backendDelegationPolicyHash(config.did, ownerDidFromAddress(address)),
  });

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
      const resolution = await resolver.resolve(address, {
        activationTimeoutMs: config.activationTimeoutMs ?? ACTIVATION_TIMEOUT_MS,
      });

      if (resolution.kind === "none") {
        res.json(base);
        return;
      }

      if (resolution.kind === "expired" || resolution.kind === "stale") {
        res.json({
          ...base,
          delegation: {
            status: resolution.kind,
            stored: true,
            validPolicy: false,
            expiresAt: resolution.stored.expiresAt,
            activation: "unknown",
          },
        } satisfies WorkspaceStateResponse);
        return;
      }

      const access = resolution.kind === "active" ? resolution.access : null;
      const activation: WorkspaceStateResponse["delegation"]["activation"] =
        resolution.kind === "active"
          ? "active"
          : resolution.kind === "timeout"
            ? "pending"
            : "failed";
      const activationError =
        resolution.kind === "failed" ? describeWorkspaceError(resolution.error) : undefined;
      const response: WorkspaceStateResponse = {
        ...base,
        delegation: {
          status: "active",
          stored: true,
          validPolicy: true,
          expiresAt: resolution.stored.expiresAt,
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
      const code = errorCode(err) ?? "workspace_state_failed";
      res.status(code === "workspace_state_failed" ? 500 : 503).json({
        error: code,
        message:
          code === "workspace_state_failed"
            ? "Failed to load workspace state"
            : err instanceof Error
              ? err.message
              : String(err),
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
  const result = await readSourceApiKeyResult(access, secretName);
  if (result.ok) return { readable: true };
  if (result.reason === "missing") return { readable: false };
  return {
    readable: null,
    error: result.error.code ?? result.error.message ?? "secret_check_failed",
  };
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function describeWorkspaceError(error: unknown): string {
  const code = errorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  return code && !message.includes(code) ? `${code}: ${message}` : message;
}

async function readGoogleMeetState(
  access: DelegatedAccess,
): Promise<Pick<WorkspaceStateResponse["googleMeet"], "connected" | "error">> {
  try {
    return { connected: await googleTokensExist(access) };
  } catch (error) {
    return { connected: null, error: describeWorkspaceError(error) };
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

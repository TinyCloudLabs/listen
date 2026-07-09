import "./types/index.js";

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { apiReference } from "@scalar/express-api-reference";
import { load as loadYaml } from "js-yaml";
import { deserializeDelegation } from "@tinycloud/node-sdk";
import {
  createBackendIdentity,
  DelegationStore,
  DelegationCache,
  createCsrfMiddleware,
  createNonceStore,
  withSessionRefresh,
} from "@listen/server";
import { DELEGATION_STORE_REVALIDATE_MS } from "@listen/core";

import { createAuthMiddleware } from "./middleware/auth.js";
import { createDelegationMiddleware } from "./middleware/delegation.js";
import { activatePortableDelegation } from "./delegation-activation.js";
import { backendDelegationPolicyHash, ownerDidFromAddress, resolveAppPath } from "./manifest.js";
import { createAuthRouter } from "./routes/auth.js";
import { createHealthRouter } from "./routes/health.js";
import { createManifestRouter } from "./routes/manifest.js";
import { createServerInfoRouter } from "./routes/server-info.js";
import { createDelegationRouter } from "./routes/delegations.js";
import { createWorkspaceStateRouter } from "./routes/workspace-state.js";
import { createConfigRouter } from "./routes/config.js";
import { createFirefliesRouter } from "./routes/fireflies.js";
import { createGranolaRouter } from "./routes/granola.js";
import { createSoundcoreRouter } from "./routes/soundcore.js";
import { createSyncRouter } from "./routes/sync.js";
import { createSyncJobsRouter, type SyncJobResumeRegistry } from "./routes/sync-jobs.js";
import { createGranolaSyncRouter } from "./routes/granola-sync.js";
import { createOtterRouter } from "./routes/otter.js";
import { createOtterSyncRouter } from "./routes/otter-sync.js";
import { createSoundcoreSyncRouter } from "./routes/soundcore-sync.js";
import { createConversationsRouter } from "./routes/conversations.js";
import { createSchemaRouter } from "./routes/schema.js";
import { createWebhookRouter } from "./routes/webhooks.js";
import { createGoogleMeetPushRouter } from "./routes/google-meet-webhooks.js";
import { createGoogleMeetSyncRouter } from "./routes/google-meet-sync.js";
import { createGoogleMeetStatusRouter } from "./routes/google-meet-status.js";
import { createGoogleAuthRouter } from "./routes/google-auth.js";
import rateLimitHandler from "./rate-limit-handler.js";
import {
  initGoogleMeetWebhooks,
  isGoogleMeetWebhooksEnabled,
} from "./services/google-meet-webhooks.js";
import {
  parsePubSubConfig,
  createMeetSubscription,
  deleteMeetSubscription,
} from "./services/pubsub-manager.js";

// ── Environment ──────────────────────────────────────────────────────

if (!process.env.BACKEND_PRIVATE_KEY) {
  console.error("BACKEND_PRIVATE_KEY is required. Generate one with: bun run generate-key");
  process.exit(1);
}

const BACKEND_PRIVATE_KEY: string = process.env.BACKEND_PRIVATE_KEY;
const TINYCLOUD_HOST = process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://localhost:5173";
const LOCAL_FRONTEND_ORIGINS = [
  "https://listen.localhost",
  "https://listen.localhost:1355",
  "https://localhost:5173",
  "http://localhost:5173",
] as const;
const FRONTEND_ORIGINS = new Set([
  ...FRONTEND_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...LOCAL_FRONTEND_ORIGINS,
]);
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ── Bootstrap ────────────────────────────────────────────────────────

async function main() {
  // 1. Initialize backend identity (sign in to TinyCloud)
  console.log("Signing in to TinyCloud...");
  const { node, did } = await createBackendIdentity({
    privateKey: BACKEND_PRIVATE_KEY,
    host: TINYCLOUD_HOST,
  });

  // 1b. Initialize Google Meet webhook infrastructure (Pub/Sub topic + subscription)
  // Gracefully skipped if GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_PUBSUB_PUSH_URL are not set
  await initGoogleMeetWebhooks();

  // 2. Create delegation infrastructure
  const delegationStore = new DelegationStore(node);
  const delegationCache = new DelegationCache();

  // 3. Create auth infrastructure
  const nonceStore = createNonceStore();
  const authMiddleware = createAuthMiddleware(BACKEND_PRIVATE_KEY);

  const delegationMiddleware = createDelegationMiddleware({
    node,
    store: delegationStore,
    cache: delegationCache,
    backendDid: did,
  });

  // 4. Backend KV accessor (for webhook config stored in backend's own space)
  const backendKV = {
    get: (key: string) => withSessionRefresh(node, () => node.kv.get(key)),
    put: (key: string, value: string) => withSessionRefresh(node, () => node.kv.put(key, value)),
  } as any;
  const syncJobResumers: SyncJobResumeRegistry = {};

  const parsedRevalidate = parseInt(process.env.DELEGATION_STORE_REVALIDATE_MS ?? "", 10);
  const revalidateMs = Number.isNaN(parsedRevalidate)
    ? DELEGATION_STORE_REVALIDATE_MS
    : parsedRevalidate;

  // Short TTL memo — collapses repeated reads of a value that only changes on an
  // out-of-band config save (webhook user-address); staleness window is the TTL.
  function ttlMemo<T>(fn: () => Promise<T>, ttlMs: number): () => Promise<T> {
    let cached: { at: number; value: T } | null = null;
    return async () => {
      if (cached && Date.now() - cached.at < ttlMs) return cached.value;
      const value = await fn();
      cached = { at: Date.now(), value };
      return value;
    };
  }

  // Single delegation resolver for out-of-request contexts (webhooks, google-auth).
  // A warm cache is validated in-memory via the Step 1 metadata (expiry + policy +
  // revalidation TTL) with NO store read; past the TTL it does exactly ONE store.load
  // and reuses the cached access when the row is still current (the pre-unification
  // resolvers loaded twice on the cache-invalid path). Expiry evicts the cache but
  // does NOT remove the store row (intentional — see flow-analysis); a stale policy
  // hash removes + evicts. google-auth previously skipped the policy check; unifying
  // adds it.
  const resolveDelegatedAccessFor = async (address: string, label: string) => {
    const ownerDid = ownerDidFromAddress(address);
    const entry = delegationCache.getEntry(address);
    if (entry) {
      const meta = entry.meta;
      const fresh =
        meta !== undefined &&
        new Date(meta.expiresAt).getTime() > Date.now() &&
        meta.policyHash === backendDelegationPolicyHash(did, ownerDid) &&
        Date.now() - entry.lastStoreCheckAt < revalidateMs;
      if (fresh) return entry.delegatedAccess;

      const stored = await delegationStore.load(address);
      if (!stored) {
        console.log(`${label} cached delegation has no stored record`);
        delegationCache.evict(address);
        return null;
      }
      if (new Date(stored.expiresAt).getTime() <= Date.now()) {
        console.log(`${label} cached delegation expired at ${stored.expiresAt}`);
        delegationCache.evict(address);
        return null;
      }
      if (stored.policyHash !== backendDelegationPolicyHash(did, ownerDid)) {
        console.log(`${label} cached delegation policy is stale`);
        await delegationStore.remove(address);
        delegationCache.evict(address);
        return null;
      }
      delegationCache.markStoreChecked(address, {
        expiresAt: stored.expiresAt,
        policyHash: stored.policyHash,
      });
      return entry.delegatedAccess;
    }

    // Cold: single store.load + activate.
    const stored = await delegationStore.load(address);
    if (!stored) {
      console.log(`${label} no delegation in store for this address`);
      return null;
    }
    if (new Date(stored.expiresAt).getTime() <= Date.now()) {
      console.log(`${label} delegation expired at ${stored.expiresAt}`);
      return null;
    }
    if (stored.policyHash !== backendDelegationPolicyHash(did, ownerDid)) {
      console.log(`${label} delegation policy is stale — user needs to sign in again`);
      await delegationStore.remove(address);
      delegationCache.evict(address);
      return null;
    }
    try {
      const delegation = deserializeDelegation(stored.serialized);
      const access = await activatePortableDelegation(node, delegation);
      delegationCache.set(address, access, {
        expiresAt: stored.expiresAt,
        policyHash: stored.policyHash,
      });
      console.log(`${label} delegation activated from store`);
      return access;
    } catch (err) {
      console.error(`${label} failed to activate delegation:`, err);
      return null;
    }
  };

  // Resolve delegated access for webhook processing (single-user mode)
  const WEBHOOK_USER_ADDRESS_PATH = resolveAppPath("webhooks/config/user-address");
  const readWebhookUserAddress = ttlMemo(async () => {
    const addrResult = await backendKV.get(WEBHOOK_USER_ADDRESS_PATH);
    return addrResult.ok && (addrResult as any).data?.data
      ? String((addrResult as any).data.data)
      : null;
  }, 60_000);
  const tryGetDelegatedAccess = async () => {
    const address = await readWebhookUserAddress();
    if (!address) {
      console.log(
        "[webhook] no user-address stored — webhook secret may not have been saved with a signed-in user",
      );
      return null;
    }
    return resolveDelegatedAccessFor(address, "[webhook]");
  };

  // 5. Set up Express
  const app = express();
  // trust proxy "loopback" + IP-keyed limiters means behind a non-loopback reverse proxy
  // (e.g. a CVM ingress on another host) req.ip is the proxy address and all users share
  // one rate-limit bucket; revisit trust proxy and/or key limiters by authenticated address
  // if the deploy topology changes.
  app.set("trust proxy", "loopback");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || FRONTEND_ORIGINS.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
    }),
  );
  app.use("/healthz", createHealthRouter());

  // Webhook routes — mounted before express.json() so raw body is preserved for HMAC verification
  // Auth + delegation middleware passed for pending queue endpoints (GET/DELETE)
  app.use(
    "/api/webhooks",
    createWebhookRouter({
      backendKV,
      tryGetDelegatedAccess,
      authMiddleware: authMiddleware as any,
      delegationMiddleware: delegationMiddleware as any,
    }),
  );

  app.use(express.json({ limit: "25mb" }));

  // Google Meet push endpoint — after JSON parsing, before CSRF (public, OIDC-verified)
  const pubSubConfig = parsePubSubConfig();
  if (pubSubConfig) {
    const GOOGLE_MEET_USER_ADDRESS_PATH = resolveAppPath(
      "webhooks/config/google-meet-user-address",
    );
    const readGoogleMeetUserAddress = ttlMemo(async () => {
      const addrResult = await backendKV.get(GOOGLE_MEET_USER_ADDRESS_PATH);
      return addrResult.ok && (addrResult as any).data?.data
        ? String((addrResult as any).data.data)
        : null;
    }, 60_000);
    const tryGetGoogleMeetAccess = async () => {
      const address = await readGoogleMeetUserAddress();
      if (!address) return null;
      return resolveDelegatedAccessFor(address, "[google-meet-webhook]");
    };

    app.use(
      "/api/webhooks/google-meet",
      createGoogleMeetPushRouter({
        backendKV,
        tryGetDelegatedAccess: tryGetGoogleMeetAccess,
        expectedAudience: pubSubConfig.pushUrl,
        expectedEmail: pubSubConfig.serviceAccountEmail,
        authMiddleware: authMiddleware as any,
        delegationMiddleware: delegationMiddleware as any,
      }),
    );
  }

  app.use(createCsrfMiddleware());

  // 6. Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler("Too many requests"),
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler("Too many auth requests"),
  });

  const delegationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler("Too many delegation requests"),
  });

  const syncJobsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 240,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: rateLimitHandler("Too many sync status requests"),
  });

  // Dedicated limiter: active-sync polling (1 req/5s = 180/15min) cannot fit the
  // general 100/15min budget; this endpoint is auth-gated, read-mostly, and
  // replaces three per-source polls (which also each ran the delegation middleware
  // twice via the /api/sync mount fall-through). Mounted before the /api/sync router
  // so the fireflies router middleware stack never runs for it.
  app.use(
    "/api/sync/jobs",
    syncJobsLimiter,
    createSyncJobsRouter({
      authMiddleware,
      delegationMiddleware,
      backendKV,
      resumeRegistry: syncJobResumers,
    }),
  );

  app.use(generalLimiter);

  // 7. Mount routes
  app.use("/api/manifest", createManifestRouter(did));
  app.use("/api/server-info", createServerInfoRouter(did));

  app.use(
    "/api/auth",
    authLimiter,
    createAuthRouter({
      nonceStore,
      privateKey: BACKEND_PRIVATE_KEY,
    }),
  );

  app.use(
    "/api/delegations",
    createDelegationRouter({
      node,
      did,
      store: delegationStore,
      cache: delegationCache,
      authMiddleware,
      writeLimiter: delegationLimiter,
    }),
  );

  app.use(
    "/api/workspace-state",
    createWorkspaceStateRouter({
      node,
      did,
      store: delegationStore,
      cache: delegationCache,
      authMiddleware,
    }),
  );

  // Config routes (Fireflies API key + webhook config)
  app.use(
    "/api/config",
    createConfigRouter({
      authMiddleware,
      delegationMiddleware,
      backendKV,
      frontendUrl: FRONTEND_URL,
      deleteSubscription: deleteMeetSubscription,
    }),
  );

  // Google OAuth routes
  app.use(
    "/api/auth/google",
    createGoogleAuthRouter({
      authMiddleware,
      delegationMiddleware,
      resolveDelegation: (address: string) => resolveDelegatedAccessFor(address, "[google-auth]"),
      backendKV,
      isWebhooksEnabled: isGoogleMeetWebhooksEnabled,
      createMeetSubscription,
      pubSubProjectId: pubSubConfig?.projectId,
    }),
  );

  // Fireflies proxy routes (connection test)
  app.use(
    "/api/fireflies",
    createFirefliesRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Granola proxy routes (connection test)
  app.use(
    "/api/granola",
    createGranolaRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Otter connection routes (validate + seal the session cookie)
  app.use(
    "/api/otter",
    createOtterRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Soundcore proxy routes (connection test)
  app.use(
    "/api/soundcore",
    createSoundcoreRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Sync routes (Fireflies transcript sync with pre-fetch dedup)
  app.use(
    "/api/sync",
    createSyncRouter({
      authMiddleware,
      delegationMiddleware,
      backendKV,
      resumeRegistry: syncJobResumers,
    }),
  );

  // Granola sync routes
  app.use(
    "/api/sync/granola",
    createGranolaSyncRouter({
      authMiddleware,
      delegationMiddleware,
      backendKV,
      resumeRegistry: syncJobResumers,
    }),
  );

  // Soundcore sync routes
  app.use(
    "/api/sync/soundcore",
    createSoundcoreSyncRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Otter sync routes (incremental transcript sync via the sealed cookie)
  app.use(
    "/api/sync/otter",
    createOtterSyncRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Google Meet sync routes
  app.use(
    "/api/sync/google-meet",
    createGoogleMeetSyncRouter({
      authMiddleware,
      delegationMiddleware,
      backendKV,
      resumeRegistry: syncJobResumers,
    }),
  );

  // Google Meet connection status
  app.use(
    "/api/google-meet",
    createGoogleMeetStatusRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Conversations routes (read-only list and detail)
  app.use(
    "/api/conversations",
    createConversationsRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // Schema seeding trigger (backend-primary seeder for first direct browser read)
  app.use(
    "/api/schema",
    createSchemaRouter({
      authMiddleware,
      delegationMiddleware,
    }),
  );

  // 8. OpenAPI docs
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const spec = loadYaml(readFileSync(resolve(__dirname, "../openapi.yaml"), "utf-8")) as object;
  app.get("/api/openapi.json", (_req, res) => res.json(spec));
  app.use("/api/docs", apiReference({ spec: { content: spec } }));

  // 9. Start server
  const server = app.listen(PORT, () => {
    console.log(`Backend ready. DID: ${did}`);
    console.log(`Listening on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
    });
    // Wait for in-flight requests (max 10s)
    setTimeout(() => {
      console.log("Forced shutdown after timeout.");
      process.exit(0);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});

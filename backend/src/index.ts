import "./types/index.js";

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { apiReference } from "@scalar/express-api-reference";
import { load as loadYaml } from "js-yaml";
import {
  createBackendIdentity,
  DelegationStore,
  DelegationCache,
  createCsrfMiddleware,
  createNonceStore,
  withSessionRefresh,
} from "@listen/server";

import { createAuthMiddleware } from "./middleware/auth.js";
import { createDelegationMiddleware } from "./middleware/delegation.js";
import { createDelegationActivator } from "./delegation-activation.js";
import { backendDelegationPolicyHash, ownerDidFromAddress, resolveAppPath } from "./manifest.js";
import { createDelegationResolver } from "./delegation-resolver.js";
import {
  resolveGoogleMeetDelegation,
  resolveOwnerAddressDelegation,
} from "./google-meet-delegation.js";
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
  const delegationActivator = createDelegationActivator(node, delegationCache);
  const delegationResolver = createDelegationResolver({
    store: delegationStore,
    cache: delegationCache,
    activator: delegationActivator,
    policyHashForAddress: (address) =>
      backendDelegationPolicyHash(did, ownerDidFromAddress(address)),
  });

  // 3. Create auth infrastructure
  const nonceStore = createNonceStore();
  const authMiddleware = createAuthMiddleware(BACKEND_PRIVATE_KEY);

  const delegationMiddleware = createDelegationMiddleware({
    store: delegationStore,
    cache: delegationCache,
    activator: delegationActivator,
    backendDid: did,
  });

  // 4. Backend KV accessor (for webhook config stored in backend's own space)
  const backendKV = {
    get: (key: string) => withSessionRefresh(node, () => node.kv.get(key)),
    put: (key: string, value: string) => withSessionRefresh(node, () => node.kv.put(key, value)),
  } as any;

  // Resolve delegated access for webhook processing (single-user mode)
  const WEBHOOK_USER_ADDRESS_PATH = resolveAppPath("webhooks/config/user-address");
  const tryGetDelegatedAccess = () =>
    resolveOwnerAddressDelegation({
      readOwnerAddress: () => backendKV.get(WEBHOOK_USER_ADDRESS_PATH),
      resolve: (address) => delegationResolver.resolve(address),
    });

  // 5. Set up Express
  const app = express();
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
    const tryGetGoogleMeetAccess = () =>
      resolveGoogleMeetDelegation({
        readOwnerAddress: () => backendKV.get(GOOGLE_MEET_USER_ADDRESS_PATH),
        resolve: (address) => delegationResolver.resolve(address),
      });

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
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", message: "Too many auth requests" },
  });

  const delegationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", message: "Too many delegation requests" },
  });

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
      did,
      store: delegationStore,
      cache: delegationCache,
      activator: delegationActivator,
      authMiddleware,
      writeLimiter: delegationLimiter,
    }),
  );

  app.use(
    "/api/workspace-state",
    createWorkspaceStateRouter({
      did,
      store: delegationStore,
      cache: delegationCache,
      activator: delegationActivator,
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
      resolveDelegation: async (address: string) => {
        const resolution = await delegationResolver.resolve(address);
        return resolution.kind === "active" ? resolution.access : null;
      },
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
    }),
  );

  // Granola sync routes
  app.use(
    "/api/sync/granola",
    createGranolaSyncRouter({
      authMiddleware,
      delegationMiddleware,
      backendKV,
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

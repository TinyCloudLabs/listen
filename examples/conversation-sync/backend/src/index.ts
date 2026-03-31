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
  withSessionRefresh,
} from "@tinyboilerplate/server";

import { createAuthMiddleware } from "./middleware/auth.js";
import { createDelegationMiddleware } from "./middleware/delegation.js";
import { createServerInfoRouter } from "./routes/server-info.js";
import { createDelegationRouter } from "./routes/delegations.js";
import { createConfigRouter } from "./routes/config.js";
import { createFirefliesRouter } from "./routes/fireflies.js";
import { createSyncRouter } from "./routes/sync.js";
import { createConversationsRouter } from "./routes/conversations.js";
import { createWebhookRouter } from "./routes/webhooks.js";

// ── Environment ──────────────────────────────────────────────────────

const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;
const TINYCLOUD_HOST = process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz";
const OPENKEY_ISSUER_URL = process.env.OPENKEY_ISSUER_URL ?? "https://openkey.so";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const PORT = parseInt(process.env.PORT ?? "3001", 10);

if (!BACKEND_PRIVATE_KEY) {
  console.error("BACKEND_PRIVATE_KEY is required. Generate one with: bun run generate-key");
  process.exit(1);
}

// ── Bootstrap ────────────────────────────────────────────────────────

async function main() {
  // 1. Initialize backend identity (sign in to TinyCloud)
  console.log("Signing in to TinyCloud...");
  const { node, did } = await createBackendIdentity({
    privateKey: BACKEND_PRIVATE_KEY,
    host: TINYCLOUD_HOST,
  });

  // 2. Create delegation infrastructure
  const delegationStore = new DelegationStore(node);
  const delegationCache = new DelegationCache();

  // 3. Create middleware
  const authMiddleware = createAuthMiddleware(OPENKEY_ISSUER_URL);

  const delegationMiddleware = createDelegationMiddleware({
    node,
    store: delegationStore,
    cache: delegationCache,
  });

  // 4. Backend KV accessor (for webhook config stored in backend's own space)
  const backendKV = {
    get: (key: string) => withSessionRefresh(node, () => node.kv.get(key)),
    put: (key: string, value: string) => withSessionRefresh(node, () => node.kv.put(key, value)),
  };

  // Resolve delegated access for webhook processing (single-user mode)
  const WEBHOOK_USER_SUB_PATH = "/app.webhooks/config/user-sub";
  const tryGetDelegatedAccess = async () => {
    const subResult = await backendKV.get(WEBHOOK_USER_SUB_PATH);
    const sub =
      subResult.ok && (subResult as any).data?.data ? String((subResult as any).data.data) : null;
    if (!sub) {
      console.log(
        "[webhook] no user-sub stored — webhook secret may not have been saved with a signed-in user",
      );
      return null;
    }
    console.log(`[webhook] resolving delegation for sub=${sub}`);

    // Check cache first
    let access = delegationCache.get(sub);
    if (access) {
      console.log("[webhook] delegation found in cache");
      return access;
    }

    // Load from persistent store
    const stored = await delegationStore.load(sub);
    if (!stored) {
      console.log(
        "[webhook] no delegation in store for this sub — user needs to sign in and delegate",
      );
      return null;
    }
    if (new Date(stored.expiresAt).getTime() <= Date.now()) {
      console.log(`[webhook] delegation expired at ${stored.expiresAt}`);
      return null;
    }

    // Activate delegation
    try {
      const delegation = deserializeDelegation(stored.serialized);
      access = await node.useDelegation(delegation);
      delegationCache.set(sub, access);
      console.log("[webhook] delegation activated from store");
      return access;
    } catch (err) {
      console.error("[webhook] failed to activate delegation:", err);
      return null;
    }
  };

  // 5. Set up Express
  const app = express();
  app.use(cors({ origin: FRONTEND_URL }));

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

  app.use(express.json());
  app.use(createCsrfMiddleware());

  // 5. Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  const delegationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", message: "Too many delegation requests" },
  });

  app.use(generalLimiter);

  // 6. Mount routes
  app.use("/api/server-info", createServerInfoRouter(did));

  app.use(
    "/api/delegations",
    delegationLimiter,
    createDelegationRouter({
      node,
      did,
      store: delegationStore,
      cache: delegationCache,
      authMiddleware,
      openKeyIssuerUrl: OPENKEY_ISSUER_URL,
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

  // Sync routes (Fireflies transcript sync with pre-fetch dedup)
  app.use(
    "/api/sync",
    createSyncRouter({
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

  // 7. OpenAPI docs
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const spec = loadYaml(readFileSync(resolve(__dirname, "../openapi.yaml"), "utf-8")) as object;
  app.get("/api/openapi.json", (_req, res) => res.json(spec));
  app.use("/api/docs", apiReference({ spec: { content: spec } }));

  // 8. Start server
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

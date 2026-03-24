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
} from "@tinyboilerplate/server";

import { createAuthMiddleware } from "./middleware/auth.js";
import { createDelegationMiddleware } from "./middleware/delegation.js";
import { createServerInfoRouter } from "./routes/server-info.js";
import { createDelegationRouter } from "./routes/delegations.js";
import { createItemsRouter } from "./routes/items.js";

// ── Environment ──────────────────────────────────────────────────────

const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;
const TINYCLOUD_HOST = process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz";
const OPENKEY_ISSUER_URL = process.env.OPENKEY_ISSUER_URL ?? "https://openkey.so";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://localhost:5173";
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

  // 4. Set up Express
  const app = express();
  app.use(cors({ origin: FRONTEND_URL }));
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

  app.use("/api/items", authMiddleware, delegationMiddleware, createItemsRouter());

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

import "./types/index.js";

import express from "express";
import cors from "cors";
import {
  createBackendIdentity,
  DelegationStore,
  DelegationCache,
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

  // 4. Set up Express
  const app = express();
  app.use(cors({ origin: FRONTEND_URL }));
  app.use(express.json());

  // 5. Mount routes
  app.use("/api/server-info", createServerInfoRouter(did));

  app.use(
    "/api/delegations",
    createDelegationRouter({
      node,
      did,
      store: delegationStore,
      cache: delegationCache,
      authMiddleware,
      openKeyIssuerUrl: OPENKEY_ISSUER_URL,
    }),
  );

  app.use(
    "/api/items",
    authMiddleware,
    delegationMiddleware,
    createItemsRouter(),
  );

  // 6. Start server
  app.listen(PORT, () => {
    console.log(`Backend ready. DID: ${did}`);
    console.log(`Listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start backend:", err);
  process.exit(1);
});

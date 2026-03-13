import { describe, it, expect, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import { createServerInfoRouter } from "../routes/server-info.js";

// ── Helpers ───────────────────────────────────────────────────────────

const TEST_DID = "did:pkh:eip155:1:0xTEST";

function createApp() {
  const app = express();
  app.use("/api/server-info", createServerInfoRouter(TEST_DID));
  return app;
}

function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      resolve({ server, port });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("GET /api/server-info", () => {
  let server: Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("returns 200 with did and status 'ready'", async () => {
    const app = createApp();
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;

    const res = await fetch(`${baseUrl}/api/server-info`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      did: TEST_DID,
      status: "ready",
    });
  });

  it("does not require authentication", async () => {
    const app = createApp();
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;

    // No Authorization header sent
    const res = await fetch(`${baseUrl}/api/server-info`);
    expect(res.status).toBe(200);
  });

  it("returns correct Content-Type", async () => {
    const app = createApp();
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;

    const res = await fetch(`${baseUrl}/api/server-info`);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("returns 404 for non-existent sub-routes", async () => {
    const app = createApp();
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;

    const res = await fetch(`${baseUrl}/api/server-info/nonexistent`);
    expect(res.status).toBe(404);
  });
});

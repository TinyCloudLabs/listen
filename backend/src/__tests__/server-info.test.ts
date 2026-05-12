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
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;

  afterEach(async () => {
    if (server) await closeServer(server);
    if (originalGoogleClientId == null) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    }
  });

  it("returns 200 with did, status, and backend TinyCloud permissions", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const app = createApp();
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;

    const res = await fetch(`${baseUrl}/api/server-info`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      did: TEST_DID,
      status: "ready",
      name: "Listen Backend",
      expiry: "7d",
    });
    expect(Array.isArray(body.permissions)).toBe(true);
    const services = new Set<string>(
      (body.permissions as Array<{ service: string }>).map((p) => p.service),
    );
    expect(services.has("tinycloud.kv")).toBe(true);
    expect(services.has("tinycloud.sql")).toBe(true);
    const sqlPermission = (
      body.permissions as Array<{ service: string; path: string; description?: string }>
    ).find((p) => p.service === "tinycloud.sql");
    expect(sqlPermission?.path).toBe("conversations");
    expect(sqlPermission?.description).toContain("conversation records");
    expect(body.features.googleMeet).toEqual({
      available: false,
      reason: "google_client_not_configured",
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

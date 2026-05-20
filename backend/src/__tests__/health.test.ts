import { describe, it, expect, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import { createHealthRouter } from "../routes/health.js";

function createApp() {
  const app = express();
  app.use("/healthz", createHealthRouter());
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

describe("GET /healthz", () => {
  let server: Server;
  const originalBuildSha = process.env.LISTEN_BUILD_SHA;
  const originalDeployRunUrl = process.env.LISTEN_DEPLOY_RUN_URL;

  afterEach(async () => {
    if (server) await closeServer(server);
    if (originalBuildSha == null) {
      delete process.env.LISTEN_BUILD_SHA;
    } else {
      process.env.LISTEN_BUILD_SHA = originalBuildSha;
    }
    if (originalDeployRunUrl == null) {
      delete process.env.LISTEN_DEPLOY_RUN_URL;
    } else {
      process.env.LISTEN_DEPLOY_RUN_URL = originalDeployRunUrl;
    }
  });

  it("returns public backend health and deployment metadata", async () => {
    process.env.LISTEN_BUILD_SHA = "abc123";
    process.env.LISTEN_DEPLOY_RUN_URL = "https://github.com/TinyCloudLabs/listen/actions/runs/1";

    const app = createApp();
    const result = await startServer(app);
    server = result.server;

    const res = await fetch(`http://localhost:${result.port}/healthz`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      service: "listen-backend",
      buildSha: "abc123",
      deployRunUrl: "https://github.com/TinyCloudLabs/listen/actions/runs/1",
    });
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });
});

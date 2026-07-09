import { describe, it, expect, afterEach } from "bun:test";
import express from "express";
import rateLimit from "express-rate-limit";
import type { Server } from "http";
import rateLimitHandler from "../rate-limit-handler.js";

function createApp() {
  const app = express();
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 1,
      handler: rateLimitHandler("Too many requests"),
    }),
  );
  app.get("/", (_req, res) => {
    res.json({ ok: true });
  });
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

describe("rateLimitHandler", () => {
  let server: Server;

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("returns a coded 429 JSON body with Retry-After", async () => {
    const app = createApp();
    const result = await startServer(app);
    server = result.server;
    const baseUrl = `http://localhost:${result.port}`;

    await fetch(baseUrl);
    const res = await fetch(baseUrl);

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toMatch(/^\d+$/);

    const body = await res.json();
    expect(body.error).toBe("rate_limited");
    expect(body.message).toBe("Too many requests");
  });
});

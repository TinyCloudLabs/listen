import { describe, test, expect } from "bun:test";
import express from "express";
import { createCsrfMiddleware } from "../csrf.js";

// ── Helpers ──────────────────────────────────────────────────────────

function createTestApp(config?: Parameters<typeof createCsrfMiddleware>[0]) {
  const app = express();
  app.use(express.json());
  app.use(createCsrfMiddleware(config));
  app.all("/test", (_req, res) => res.json({ ok: true }));
  return app;
}

async function req(app: express.Express, method: string, headers?: Record<string, string>) {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const res = await fetch(`http://localhost:${port}/test`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
    });
    const body = await res.json();
    return { status: res.status, body };
  } finally {
    server.close();
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe("createCsrfMiddleware", () => {
  // ── Safe methods pass without header ──

  test("GET passes without X-Requested-With header", async () => {
    const app = createTestApp();
    const { status, body } = await req(app, "GET");
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  test("HEAD passes without X-Requested-With header", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://localhost:${port}/test`, { method: "HEAD" });
      expect(res.status).toBe(200);
    } finally {
      server.close();
    }
  });

  test("OPTIONS passes without X-Requested-With header", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://localhost:${port}/test`, { method: "OPTIONS" });
      // Express returns 200 for OPTIONS on app.all routes
      expect(res.status).toBe(200);
    } finally {
      server.close();
    }
  });

  // ── Unsafe methods blocked without header ──

  test("POST without header returns 403 csrf_rejected", async () => {
    const app = createTestApp();
    const { status, body } = await req(app, "POST");
    expect(status).toBe(403);
    expect(body.error).toBe("csrf_rejected");
  });

  test("PUT without header returns 403", async () => {
    const app = createTestApp();
    const { status, body } = await req(app, "PUT");
    expect(status).toBe(403);
    expect(body.error).toBe("csrf_rejected");
  });

  test("DELETE without header returns 403", async () => {
    const app = createTestApp();
    const { status, body } = await req(app, "DELETE");
    expect(status).toBe(403);
    expect(body.error).toBe("csrf_rejected");
  });

  // ── Correct header passes ──

  test("POST with correct header passes", async () => {
    const app = createTestApp();
    const { status, body } = await req(app, "POST", {
      "X-Requested-With": "Listen",
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  test("DELETE with correct header passes", async () => {
    const app = createTestApp();
    const { status, body } = await req(app, "DELETE", {
      "X-Requested-With": "Listen",
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  // ── Wrong header value rejected ──

  test("POST with wrong header value returns 403", async () => {
    const app = createTestApp();
    const { status, body } = await req(app, "POST", {
      "X-Requested-With": "WrongValue",
    });
    expect(status).toBe(403);
    expect(body.error).toBe("csrf_rejected");
  });

  // ── Custom config ──

  test("custom headerValue accepts matching value", async () => {
    const app = createTestApp({ headerValue: "MyApp" });
    const { status, body } = await req(app, "POST", {
      "X-Requested-With": "MyApp",
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  test("custom headerValue rejects default value", async () => {
    const app = createTestApp({ headerValue: "MyApp" });
    const { status, body } = await req(app, "POST", {
      "X-Requested-With": "Listen",
    });
    expect(status).toBe(403);
    expect(body.error).toBe("csrf_rejected");
  });

  test("custom headerName checks the correct header", async () => {
    const app = createTestApp({ headerName: "x-custom-csrf" });
    const { status, body } = await req(app, "POST", {
      "X-Custom-CSRF": "Listen",
    });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  test("custom safeMethods exempts specified methods", async () => {
    // Only exempt GET (not HEAD or OPTIONS)
    const app = createTestApp({ safeMethods: ["GET"] });

    // GET still passes
    const getRes = await req(app, "GET");
    expect(getRes.status).toBe(200);

    // POST without header still blocked
    const postRes = await req(app, "POST");
    expect(postRes.status).toBe(403);
  });
});

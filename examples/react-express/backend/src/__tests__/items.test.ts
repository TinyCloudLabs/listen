import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createItemsRouter } from "../routes/items.js";

// ── Mock KV Store (in-memory, Result pattern) ───────────────────────

function createMockKV() {
  const store = new Map<string, unknown>();

  return {
    _store: store,
    get: async (key: string) => {
      const value = store.get(key);
      if (value === undefined) return { ok: false, error: { message: "not found" } };
      return { ok: true, data: { data: value } };
    },
    put: async (key: string, value: unknown) => {
      store.set(key, value);
      return { ok: true };
    },
    list: async (opts: { prefix: string }) => {
      const keys = [...store.keys()].filter((k) => k.startsWith(opts.prefix));
      return { ok: true, data: { keys } };
    },
    delete: async (key: string) => {
      store.delete(key);
      return { ok: true };
    },
  };
}

// ── Mock SQL Store (in-memory, Result pattern with params) ──────────

function createMockSQL() {
  let rows: Record<string, string>[] = [];

  return {
    _getRows: () => rows,
    execute: async (sql: string, params?: (string | number | null)[]) => {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith("CREATE TABLE")) {
        return { ok: true };
      }

      if (trimmed.startsWith("INSERT")) {
        if (params && params.length >= 5) {
          rows.push({
            id: String(params[0]),
            title: String(params[1]),
            data: String(params[2]),
            created_at: String(params[3]),
            updated_at: String(params[4]),
          });
        }
        return { ok: true };
      }

      if (trimmed.startsWith("UPDATE")) {
        // Last param is the WHERE id
        const id = params ? String(params[params.length - 1]) : null;
        if (id) {
          const row = rows.find((r) => r.id === id);
          if (row) {
            // Parse SET clauses from the params (excluding last = WHERE id)
            const setParams = params!.slice(0, -1);
            const setClauses = sql.match(/(\w+)\s*=\s*\?/g) ?? [];
            setClauses.forEach((clause, i) => {
              const col = clause.split("=")[0].trim();
              if (setParams[i] != null) row[col] = String(setParams[i]);
            });
          }
        }
        return { ok: true };
      }

      if (trimmed.startsWith("DELETE")) {
        const id = params ? String(params[0]) : null;
        if (id) rows = rows.filter((r) => r.id !== id);
        return { ok: true };
      }

      return { ok: true };
    },
    query: async (sql: string, params?: (string | number | null)[]) => {
      const trimmed = sql.trim().toUpperCase();
      const columns = ["id", "title", "data", "created_at", "updated_at"];

      // SELECT with WHERE id = ?
      if (trimmed.includes("WHERE ID =") && params?.length) {
        const id = String(params[0]);
        const matched = rows.filter((r) => r.id === id);
        return {
          ok: true,
          data: {
            columns: trimmed.includes("SELECT ID FROM") ? ["id"] : columns,
            rows: matched.map((r) =>
              trimmed.includes("SELECT ID FROM")
                ? [r.id]
                : [r.id, r.title, r.data, r.created_at, r.updated_at],
            ),
            rowCount: matched.length,
          },
        };
      }

      // SELECT with LIKE search
      if (trimmed.includes("WHERE TITLE LIKE") && params?.length) {
        const search = String(params[0]).replace(/%/g, "");
        const matched = rows.filter((r) => r.title.includes(search) || r.data.includes(search));
        return {
          ok: true,
          data: {
            columns,
            rows: matched.map((r) => [r.id, r.title, r.data, r.created_at, r.updated_at]),
            rowCount: matched.length,
          },
        };
      }

      // SELECT all
      if (trimmed.includes("FROM ITEMS") || trimmed.includes("FROM SQLITE_MASTER")) {
        return {
          ok: true,
          data: {
            columns,
            rows: [...rows]
              .reverse()
              .map((r) => [r.id, r.title, r.data, r.created_at, r.updated_at]),
            rowCount: rows.length,
          },
        };
      }

      return { ok: true, data: { columns: [], rows: [], rowCount: 0 } };
    },
  };
}

// ── Test Helpers ──────────────────────────────────────────────────────

function createMockDelegatedAccess() {
  return {
    kv: createMockKV(),
    sql: createMockSQL(),
  };
}

function mockMiddleware(delegatedAccess: any) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.user = { address: "0xtest" };
    req.delegatedAccess = delegatedAccess;
    next();
  };
}

function createApp(delegatedAccess: any) {
  const app = express();
  app.use(express.json());
  app.use("/api/items", mockMiddleware(delegatedAccess), createItemsRouter());
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

// ── KV Store Tests ────────────────────────────────────────────────────

describe("Items CRUD (KV store)", () => {
  let server: Server;
  let baseUrl: string;
  let access: ReturnType<typeof createMockDelegatedAccess>;

  beforeEach(async () => {
    access = createMockDelegatedAccess();
    const app = createApp(access);
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("GET /api/items returns empty list initially", async () => {
    const res = await fetch(`${baseUrl}/api/items`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ items: [] });
  });

  it("POST /api/items creates an item", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hello", data: "world" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item.title).toBe("Hello");
    expect(body.item.data).toBe("world");
    expect(body.item.id).toBeDefined();
  });

  it("POST /api/items rejects missing title", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "no title" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/items/:id returns a created item", async () => {
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Fetch Me" }),
    });
    const { item } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/items/${item.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.title).toBe("Fetch Me");
  });

  it("GET /api/items/:id returns 404 for missing item", async () => {
    const res = await fetch(`${baseUrl}/api/items/nonexistent`);
    expect(res.status).toBe(404);
  });

  it("PUT /api/items/:id updates an item", async () => {
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original" }),
    });
    const { item } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.title).toBe("Updated");
  });

  it("DELETE /api/items/:id deletes an item", async () => {
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Delete Me" }),
    });
    const { item } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);

    const getRes = await fetch(`${baseUrl}/api/items/${item.id}`);
    expect(getRes.status).toBe(404);
  });

  it("GET /api/items lists all items", async () => {
    await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Item 1" }),
    });
    await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Item 2" }),
    });

    const res = await fetch(`${baseUrl}/api/items`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
  });

  it("defaults to KV store when no ?store param", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "KV Default" }),
    });
    expect(res.status).toBe(201);
    expect(access.kv._store.size).toBe(1);
  });
});

// ── SQL Store Tests ──────────────────────────────────────────────────

describe("Items CRUD (SQL store)", () => {
  let server: Server;
  let baseUrl: string;
  let access: ReturnType<typeof createMockDelegatedAccess>;

  beforeEach(async () => {
    access = createMockDelegatedAccess();
    const app = createApp(access);
    const result = await startServer(app);
    server = result.server;
    baseUrl = `http://localhost:${result.port}`;
  });

  afterEach(async () => {
    if (server) await closeServer(server);
  });

  it("GET /api/items?store=sql returns empty list initially", async () => {
    const res = await fetch(`${baseUrl}/api/items?store=sql`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });

  it("POST /api/items?store=sql creates an item", async () => {
    const res = await fetch(`${baseUrl}/api/items?store=sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SQL Item" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item.title).toBe("SQL Item");
    expect(body.item.id).toBeDefined();
  });

  it("GET /api/items?store=sql lists created items", async () => {
    await fetch(`${baseUrl}/api/items?store=sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "First" }),
    });
    await fetch(`${baseUrl}/api/items?store=sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Second" }),
    });

    const res = await fetch(`${baseUrl}/api/items?store=sql`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
  });
});

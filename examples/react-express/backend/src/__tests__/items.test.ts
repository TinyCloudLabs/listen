import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import express from "express";
import type { Server } from "http";
import type { Request, Response, NextFunction } from "express";
import { createItemsRouter } from "../routes/items.js";

// ── Mock KV Store (in-memory) ─────────────────────────────────────────

function createMockKV() {
  const store = new Map<string, string>();

  return {
    _store: store,
    get: async (key: string) => ({ data: store.get(key) ?? null }),
    put: async (key: string, value: string) => {
      store.set(key, value);
      return {};
    },
    list: async (prefix: string) => ({
      data: [...store.entries()]
        .filter(([k]) => k.startsWith(prefix))
        .map(([key, value]) => ({ key, value })),
    }),
    delete: async (key: string) => {
      store.delete(key);
      return {};
    },
  };
}

// ── Mock SQL Store (in-memory) ────────────────────────────────────────

function createMockSQL() {
  let rows: Record<string, string>[] = [];
  let tableCreated = false;

  return {
    _getRows: () => rows,
    execute: async (sql: string) => {
      const trimmed = sql.trim();

      // CREATE TABLE
      if (trimmed.toUpperCase().startsWith("CREATE TABLE")) {
        tableCreated = true;
        return {};
      }

      // INSERT INTO items (id, title, data, created_at, updated_at) VALUES (...)
      const insertMatch = trimmed.match(
        /INSERT INTO items \(id, title, data, created_at, updated_at\) VALUES \('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/i,
      );
      if (insertMatch) {
        rows.push({
          id: insertMatch[1],
          title: insertMatch[2],
          data: insertMatch[3],
          created_at: insertMatch[4],
          updated_at: insertMatch[5],
        });
        return {};
      }

      // UPDATE items SET ... WHERE id = '...'
      if (trimmed.toUpperCase().startsWith("UPDATE")) {
        const whereMatch = trimmed.match(/WHERE id = '([^']*)'/i);
        if (whereMatch) {
          const id = whereMatch[1];
          const row = rows.find((r) => r.id === id);
          if (row) {
            const titleMatch = trimmed.match(/title = '([^']*)'/i);
            const dataMatch = trimmed.match(/data = '([^']*)'/i);
            const updatedMatch = trimmed.match(/updated_at = '([^']*)'/i);
            if (titleMatch) row.title = titleMatch[1];
            if (dataMatch) row.data = dataMatch[1];
            if (updatedMatch) row.updated_at = updatedMatch[1];
          }
        }
        return {};
      }

      // DELETE FROM items WHERE id = '...'
      if (trimmed.toUpperCase().startsWith("DELETE")) {
        const whereMatch = trimmed.match(/WHERE id = '([^']*)'/i);
        if (whereMatch) {
          const id = whereMatch[1];
          rows = rows.filter((r) => r.id !== id);
        }
        return {};
      }

      return {};
    },
    query: async (sql: string) => {
      const trimmed = sql.trim();

      // SELECT ... FROM items WHERE id = '...'
      const whereMatch = trimmed.match(/WHERE id = '([^']*)'/i);
      if (whereMatch) {
        const id = whereMatch[1];
        const matched = rows.filter((r) => r.id === id);
        return { data: matched };
      }

      // SELECT ... FROM items ORDER BY ...
      if (trimmed.toUpperCase().includes("FROM ITEMS")) {
        return { data: [...rows].reverse() };
      }

      return { data: [] };
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
    req.user = { sub: "test-sub", address: "0xTEST" };
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

function startServer(
  app: express.Express,
): Promise<{ server: Server; port: number }> {
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
      body: JSON.stringify({ title: "Test Item" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item).toBeDefined();
    expect(body.item.title).toBe("Test Item");
    expect(body.item.id).toBeDefined();
    expect(body.item.createdAt).toBeDefined();
    expect(body.item.updatedAt).toBeDefined();
  });

  it("POST /api/items with data field", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "With Data", data: "some data" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item.title).toBe("With Data");
    expect(body.item.data).toBe("some data");
  });

  it("POST /api/items returns 400 without title", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "no title" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_body");
  });

  it("POST /api/items returns 400 with non-string title", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: 123 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_body");
  });

  it("GET /api/items/:id returns a created item", async () => {
    // Create an item first
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Fetch Me" }),
    });
    const { item } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/items/${item.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.id).toBe(item.id);
    expect(body.item.title).toBe("Fetch Me");
  });

  it("GET /api/items/:id returns 404 for nonexistent item", async () => {
    const res = await fetch(`${baseUrl}/api/items/nonexistent-id`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_found");
  });

  it("PUT /api/items/:id updates an item", async () => {
    // Create
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original" }),
    });
    const { item } = await createRes.json();

    // Update
    const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.title).toBe("Updated");
    expect(body.item.id).toBe(item.id);
  });

  it("PUT /api/items/:id updates data field only", async () => {
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Keep Title", data: "old data" }),
    });
    const { item } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "new data" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.title).toBe("Keep Title");
    expect(body.item.data).toBe("new data");
  });

  it("PUT /api/items/:id returns 400 without title or data", async () => {
    const res = await fetch(`${baseUrl}/api/items/some-id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_body");
  });

  it("PUT /api/items/:id returns 404 for nonexistent item", async () => {
    const res = await fetch(`${baseUrl}/api/items/nonexistent`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "nope" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_found");
  });

  it("DELETE /api/items/:id deletes an item", async () => {
    // Create
    const createRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Delete Me" }),
    });
    const { item } = await createRes.json();

    // Delete
    const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);

    // Verify deleted
    const getRes = await fetch(`${baseUrl}/api/items/${item.id}`);
    expect(getRes.status).toBe(404);
  });

  it("DELETE /api/items/:id returns 404 for nonexistent item", async () => {
    const res = await fetch(`${baseUrl}/api/items/nonexistent`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("GET /api/items lists all items", async () => {
    // Create two items
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

    // Item should be in KV store
    expect(access.kv._store.size).toBe(1);
  });
});

// ── SQL Store Tests ───────────────────────────────────────────────────

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
    expect(body).toEqual({ items: [] });
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

  it("GET /api/items/:id?store=sql returns created item", async () => {
    const createRes = await fetch(`${baseUrl}/api/items?store=sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SQL Fetch" }),
    });
    const { item } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/items/${item.id}?store=sql`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.title).toBe("SQL Fetch");
  });

  it("GET /api/items/:id?store=sql returns 404 for nonexistent", async () => {
    const res = await fetch(`${baseUrl}/api/items/nonexistent?store=sql`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_found");
  });

  it("PUT /api/items/:id?store=sql updates an item", async () => {
    const createRes = await fetch(`${baseUrl}/api/items?store=sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SQL Original" }),
    });
    const { item } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/items/${item.id}?store=sql`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SQL Updated" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.title).toBe("SQL Updated");
  });

  it("DELETE /api/items/:id?store=sql deletes an item", async () => {
    const createRes = await fetch(`${baseUrl}/api/items?store=sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SQL Delete" }),
    });
    const { item } = await createRes.json();

    const delRes = await fetch(`${baseUrl}/api/items/${item.id}?store=sql`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(204);

    const getRes = await fetch(`${baseUrl}/api/items/${item.id}?store=sql`);
    expect(getRes.status).toBe(404);
  });

  it("DELETE /api/items/:id?store=sql returns 404 for nonexistent", async () => {
    const res = await fetch(`${baseUrl}/api/items/nonexistent?store=sql`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("SQL and KV stores are independent", async () => {
    // Create in KV
    const kvRes = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "KV Only" }),
    });
    const kvItem = (await kvRes.json()).item;

    // Create in SQL
    const sqlRes = await fetch(`${baseUrl}/api/items?store=sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "SQL Only" }),
    });
    const sqlItem = (await sqlRes.json()).item;

    // KV should not see SQL item
    const kvList = await fetch(`${baseUrl}/api/items`);
    const kvBody = await kvList.json();
    expect(kvBody.items).toHaveLength(1);
    expect(kvBody.items[0].title).toBe("KV Only");

    // SQL should not see KV item
    const sqlList = await fetch(`${baseUrl}/api/items?store=sql`);
    const sqlBody = await sqlList.json();
    expect(sqlBody.items).toHaveLength(1);
    expect(sqlBody.items[0].title).toBe("SQL Only");
  });
});

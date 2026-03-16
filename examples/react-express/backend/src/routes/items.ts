import { Router } from "express";
import type { Request, Response } from "express";
import type { Item, CreateItemInput, UpdateItemInput, StoreType } from "@tinyboilerplate/core";

// ── Items Router ─────────────────────────────────────────────────────

export function createItemsRouter() {
  const router = Router();

  // GET /api/items?store=kv|sql
  router.get("/", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    const access = req.delegatedAccess!;

    try {
      if (storeType === "sql") {
        await ensureTable(access);
        const result = await access.sql.query(
          "SELECT id, title, data, created_at, updated_at FROM items ORDER BY created_at DESC",
        );
        const items: Item[] = (result.data ?? []).map(rowToItem);
        res.json({ items });
      } else {
        // KV list returns { keys: string[] }, then get each value in parallel
        const listResult = await access.kv.list({ prefix: "items/" });
        if (!listResult.ok) {
          res.json({ items: [] });
          return;
        }
        const keys = listResult.data.keys ?? [];
        const results = await Promise.all(
          keys.map((key) => access.kv.get(key))
        );
        const items: Item[] = results
          .filter((r) => r.ok && (r.data as any)?.data)
          .map((r) => {
            const val = (r.data as any).data;
            return (typeof val === "string" ? JSON.parse(val) : val) as Item;
          });
        res.json({ items });
      }
    } catch (err) {
      handleStoreError(res, err, "list items");
    }
  });

  // POST /api/items?store=kv|sql
  router.post("/", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    const access = req.delegatedAccess!;
    const input: CreateItemInput = req.body;

    if (!input.title || typeof input.title !== "string") {
      res.status(400).json({
        error: "invalid_body",
        message: "Request body must include a 'title' string field",
      });
      return;
    }

    const now = new Date().toISOString();
    const item: Item = {
      id: crypto.randomUUID(),
      title: input.title,
      data: input.data,
      createdAt: now,
      updatedAt: now,
    };

    try {
      if (storeType === "sql") {
        await ensureTable(access);
        await access.sql.execute(
          `INSERT INTO items (id, title, data, created_at, updated_at) VALUES ('${escape(item.id)}', '${escape(item.title)}', '${escape(item.data ?? "")}', '${escape(item.createdAt)}', '${escape(item.updatedAt)}')`,
        );
      } else {
        const putResult = await access.kv.put(`items/${item.id}`, item);
        if (!putResult.ok) throw new Error(`KV put failed: ${(putResult as any).error?.message}`);
      }

      res.status(201).json({ item });
    } catch (err) {
      handleStoreError(res, err, "create item");
    }
  });

  // GET /api/items/:id?store=kv|sql
  router.get("/:id", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    const access = req.delegatedAccess!;
    const { id } = req.params;

    try {
      if (storeType === "sql") {
        await ensureTable(access);
        const result = await access.sql.query(
          `SELECT id, title, data, created_at, updated_at FROM items WHERE id = '${escape(id)}'`,
        );
        const rows = result.data ?? [];
        if (rows.length === 0) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }
        res.json({ item: rowToItem(rows[0]) });
      } else {
        const result = await access.kv.get(`items/${id}`);
        if (!result.ok || !result.data?.data) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }
        const raw = result.data.data;
        const item: Item = typeof raw === "string" ? JSON.parse(raw) : raw;
        res.json({ item });
      }
    } catch (err) {
      handleStoreError(res, err, "get item");
    }
  });

  // PUT /api/items/:id?store=kv|sql
  router.put("/:id", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    const access = req.delegatedAccess!;
    const { id } = req.params;
    const input: UpdateItemInput = req.body;

    if (!input.title && !input.data && input.data !== "") {
      res.status(400).json({
        error: "invalid_body",
        message: "Request body must include at least 'title' or 'data'",
      });
      return;
    }

    try {
      const now = new Date().toISOString();

      if (storeType === "sql") {
        await ensureTable(access);

        // Check if exists
        const existing = await access.sql.query(
          `SELECT id FROM items WHERE id = '${escape(id)}'`,
        );
        if ((existing.data ?? []).length === 0) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }

        const setClauses: string[] = [];
        if (input.title !== undefined) setClauses.push(`title = '${escape(input.title)}'`);
        if (input.data !== undefined) setClauses.push(`data = '${escape(input.data)}'`);
        setClauses.push(`updated_at = '${escape(now)}'`);

        await access.sql.execute(
          `UPDATE items SET ${setClauses.join(", ")} WHERE id = '${escape(id)}'`,
        );

        // Fetch the updated item
        const result = await access.sql.query(
          `SELECT id, title, data, created_at, updated_at FROM items WHERE id = '${escape(id)}'`,
        );
        res.json({ item: rowToItem(result.data![0]) });
      } else {
        // KV: read-modify-write
        const result = await access.kv.get(`items/${id}`);
        if (!result.ok || !result.data?.data) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }

        const raw = result.data.data;
        const existing: Item = typeof raw === "string" ? JSON.parse(raw) : raw;
        const updated: Item = {
          ...existing,
          title: input.title ?? existing.title,
          data: input.data !== undefined ? input.data : existing.data,
          updatedAt: now,
        };

        await access.kv.put(`items/${id}`, updated);
        res.json({ item: updated });
      }
    } catch (err) {
      handleStoreError(res, err, "update item");
    }
  });

  // DELETE /api/items/:id?store=kv|sql
  router.delete("/:id", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    const access = req.delegatedAccess!;
    const { id } = req.params;

    try {
      if (storeType === "sql") {
        await ensureTable(access);

        // Check if exists
        const existing = await access.sql.query(
          `SELECT id FROM items WHERE id = '${escape(id)}'`,
        );
        if ((existing.data ?? []).length === 0) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }

        await access.sql.execute(
          `DELETE FROM items WHERE id = '${escape(id)}'`,
        );
      } else {
        // KV: check existence, then delete
        const result = await access.kv.get(`items/${id}`);
        if (!result.ok || !result.data?.data) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }

        await access.kv.delete(`items/${id}`);
      }

      res.status(204).send();
    } catch (err) {
      handleStoreError(res, err, "delete item");
    }
  });

  return router;
}

// ── Helpers ──────────────────────────────────────────────────────────

function getStoreType(req: Request): StoreType {
  const store = req.query.store as string | undefined;
  return store === "sql" ? "sql" : "kv";
}

/** Minimal SQL string escaping (single quotes) */
function escape(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * SQL table initialization flag — ensures CREATE TABLE runs at most
 * once per process per DelegatedAccess.
 */
const initializedTables = new WeakSet<object>();

async function ensureTable(access: any): Promise<void> {
  if (initializedTables.has(access)) return;

  await access.sql.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      data TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  initializedTables.add(access);
}

function rowToItem(row: any): Item {
  return {
    id: row.id,
    title: row.title,
    data: row.data ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function handleStoreError(res: Response, err: unknown, operation: string): void {
  const message = err instanceof Error ? err.message : String(err);

  console.error(`[items] Failed to ${operation}:`, message);

  res.status(500).json({
    error: "store_error",
    message: `Failed to ${operation}: ${message}`,
  });
}

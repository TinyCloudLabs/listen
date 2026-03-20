import { Router } from "express";
import type { Request, Response } from "express";
import type { Item, CreateItemInput, UpdateItemInput, StoreType } from "@tinyboilerplate/core";
import type { DelegatedAccess } from "@tinyboilerplate/server";

// ── Items Router ─────────────────────────────────────────────────────

export function createItemsRouter() {
  const router = Router();

  // GET /api/items?store=kv|sql
  router.get("/", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    if (!req.delegatedAccess) { res.status(403).json({ error: "no_delegation", message: "Delegation required" }); return; }
    const access = req.delegatedAccess;

    try {
      if (storeType === "sql") {
        await ensureTable(access);

        // SQL supports search + sort via query params
        const search = (req.query.search as string) ?? "";
        const sortBy = (req.query.sort as string) ?? "created_at";
        const sortDir = (req.query.dir as string) === "asc" ? "ASC" : "DESC";
        const validSort = ["title", "created_at", "updated_at"].includes(sortBy) ? sortBy : "created_at";

        let sql = "SELECT id, title, data, created_at, updated_at FROM items";
        const params: (string | number | null)[] = [];
        if (search) {
          sql += ` WHERE title LIKE ? OR data LIKE ?`;
          params.push(`%${search}%`, `%${search}%`);
        }
        sql += ` ORDER BY ${validSort} ${sortDir}`;

        const result = await access.sql.query(sql, params);
        if (!result.ok) throw new Error(`SQL query failed: ${result.error.message}`);
        const { rows, columns, rowCount } = result.data;
        const items: Item[] = rows.map((row) => rowToItem(row, columns));
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
          .filter((r): r is typeof r & { ok: true; data: { data: unknown } } => r.ok && r.data.data != null)
          .map((r) => {
            const val = r.data.data;
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
    if (!req.delegatedAccess) { res.status(403).json({ error: "no_delegation", message: "Delegation required" }); return; }
    const access = req.delegatedAccess;
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
        const insertResult = await access.sql.execute(
          `INSERT INTO items (id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
          [item.id, item.title, item.data ?? "", item.createdAt, item.updatedAt],
        );
        if (!insertResult.ok) throw new Error(`SQL insert failed: ${insertResult.error.message}`);
      } else {
        const putResult = await access.kv.put(`items/${item.id}`, item);
        if (!putResult.ok) throw new Error(`KV put failed: ${putResult.error.message}`);
      }

      res.status(201).json({ item });
    } catch (err) {
      handleStoreError(res, err, "create item");
    }
  });

  // GET /api/items/:id?store=kv|sql
  router.get("/:id", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    if (!req.delegatedAccess) { res.status(403).json({ error: "no_delegation", message: "Delegation required" }); return; }
    const access = req.delegatedAccess;
    const { id } = req.params;

    try {
      if (storeType === "sql") {
        await ensureTable(access);
        const result = await access.sql.query(
          `SELECT id, title, data, created_at, updated_at FROM items WHERE id = ?`,
          [id],
        );
        if (!result.ok) throw new Error(`SQL query failed: ${result.error.message}`);
        const { rows, columns } = result.data;
        if (rows.length === 0) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }
        res.json({ item: rowToItem(rows[0], columns) });
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
    if (!req.delegatedAccess) { res.status(403).json({ error: "no_delegation", message: "Delegation required" }); return; }
    const access = req.delegatedAccess;
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
          `SELECT id FROM items WHERE id = ?`,
          [id],
        );
        if (!existing.ok || existing.data.rows.length === 0) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }

        const setClauses: string[] = [];
        const updateParams: (string | number | null)[] = [];
        if (input.title !== undefined) { setClauses.push("title = ?"); updateParams.push(input.title); }
        if (input.data !== undefined) { setClauses.push("data = ?"); updateParams.push(input.data); }
        setClauses.push("updated_at = ?");
        updateParams.push(now);
        updateParams.push(id);

        const updateResult = await access.sql.execute(
          `UPDATE items SET ${setClauses.join(", ")} WHERE id = ?`,
          updateParams,
        );
        if (!updateResult.ok) throw new Error(`SQL update failed: ${updateResult.error.message}`);

        // Fetch the updated item
        const result = await access.sql.query(
          `SELECT id, title, data, created_at, updated_at FROM items WHERE id = ?`,
          [id],
        );
        if (!result.ok) throw new Error(`SQL query failed: ${result.error.message}`);
        const { rows, columns } = result.data;
        if (rows.length === 0) throw new Error("Item disappeared after update");
        res.json({ item: rowToItem(rows[0], columns) });
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

        const putResult = await access.kv.put(`items/${id}`, updated);
        if (!putResult.ok) throw new Error(`KV put failed: ${putResult.error.message}`);
        res.json({ item: updated });
      }
    } catch (err) {
      handleStoreError(res, err, "update item");
    }
  });

  // DELETE /api/items/:id?store=kv|sql
  router.delete("/:id", async (req: Request, res: Response) => {
    const storeType = getStoreType(req);
    if (!req.delegatedAccess) { res.status(403).json({ error: "no_delegation", message: "Delegation required" }); return; }
    const access = req.delegatedAccess;
    const { id } = req.params;

    try {
      if (storeType === "sql") {
        await ensureTable(access);

        // Check if exists
        const existing = await access.sql.query(
          `SELECT id FROM items WHERE id = ?`,
          [id],
        );
        if (!existing.ok || existing.data.rows.length === 0) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }

        const deleteResult = await access.sql.execute(
          `DELETE FROM items WHERE id = ?`,
          [id],
        );
        if (!deleteResult.ok) throw new Error(`SQL delete failed: ${deleteResult.error.message}`);
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

/**
 * Ensure the items table exists. Runs CREATE TABLE IF NOT EXISTS
 * at most once per DelegatedAccess instance (keyed by object identity).
 */
const tableCreated = new WeakSet<object>();

async function ensureTable(access: DelegatedAccess): Promise<void> {
  if (tableCreated.has(access)) return;

  const result = await access.sql.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      data TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  if (!result.ok) {
    throw new Error(`Failed to create items table: ${result.error.message}`);
  }

  tableCreated.add(access);
}

/**
 * Convert a SQL row to an Item.
 * QueryResponse rows are arrays (not objects), so we map by column index.
 */
function rowToItem(row: unknown[], columns: string[]): Item {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return {
    id: obj.id as string,
    title: obj.title as string,
    data: (obj.data as string) ?? undefined,
    createdAt: obj.created_at as string,
    updatedAt: obj.updated_at as string,
  };
}

function handleStoreError(res: Response, err: unknown, operation: string): void {
  console.error(`[items] ${operation} failed:`, err);

  res.status(500).json({
    error: "store_error",
    message: `Failed to ${operation}`,
  });
}

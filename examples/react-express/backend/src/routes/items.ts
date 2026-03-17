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
        if (!result.ok) throw new Error(`SQL query failed: ${(result as any).error?.message ?? "unknown"}`);
        const rows = (result.data as any)?.rows ?? [];
        const columns: string[] = (result.data as any)?.columns ?? [];
        const rowCount = (result.data as any)?.rowCount ?? rows.length;
        const items: Item[] = rows.map((row: any[]) => rowToItem(row, columns));
        res.json({ items, sql, rowCount });
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
        const insertResult = await access.sql.execute(
          `INSERT INTO items (id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
          [item.id, item.title, item.data ?? "", item.createdAt, item.updatedAt],
        );
        if (!insertResult.ok) throw new Error(`SQL insert failed: ${(insertResult as any).error?.message ?? "unknown"}`);
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
          `SELECT id, title, data, created_at, updated_at FROM items WHERE id = ?`,
          [id],
        );
        if (!result.ok) throw new Error(`SQL query failed: ${(result as any).error?.message ?? "unknown"}`);
        const rows = (result.data as any)?.rows ?? [];
        const cols: string[] = (result.data as any)?.columns ?? [];
        if (rows.length === 0) {
          res.status(404).json({
            error: "not_found",
            message: `Item '${id}' not found`,
          });
          return;
        }
        res.json({ item: rowToItem(rows[0], cols) });
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
          `SELECT id FROM items WHERE id = ?`,
          [id],
        );
        if (((existing.ok ? (existing.data as any)?.rows : null) ?? []).length === 0) {
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
        if (!updateResult.ok) throw new Error(`SQL update failed: ${(updateResult as any).error?.message ?? "unknown"}`);

        // Fetch the updated item
        const result = await access.sql.query(
          `SELECT id, title, data, created_at, updated_at FROM items WHERE id = ?`,
          [id],
        );
        if (!result.ok) throw new Error(`SQL query failed: ${(result as any).error?.message ?? "unknown"}`);
        const rows = (result.data as any)?.rows ?? [];
        if (rows.length === 0) throw new Error("Item disappeared after update");
        res.json({ item: rowToItem(rows[0], (result.data as any)?.columns ?? []) });
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
        if (!putResult.ok) throw new Error(`KV put failed: ${(putResult as any).error?.message}`);
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
          `SELECT id FROM items WHERE id = ?`,
          [id],
        );
        if (((existing.ok ? (existing.data as any)?.rows : null) ?? []).length === 0) {
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
        if (!deleteResult.ok) throw new Error(`SQL delete failed: ${(deleteResult as any).error?.message ?? "unknown"}`);
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
 * on every call — idempotent and cheap over the network.
 */
async function ensureTable(access: any): Promise<void> {
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
    throw new Error(`Failed to create items table: ${(result as any).error?.message ?? "unknown"}`);
  }
}

/**
 * Convert a SQL row to an Item.
 * QueryResponse rows are arrays (not objects), so we map by column index.
 * If columns are provided, use them; otherwise assume named object.
 */
function rowToItem(row: any, columns?: string[]): Item {
  if (columns && Array.isArray(row)) {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return {
      id: obj.id,
      title: obj.title,
      data: obj.data ?? undefined,
      createdAt: obj.created_at,
      updatedAt: obj.updated_at,
    };
  }
  return {
    id: row.id,
    title: row.title,
    data: row.data ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function handleStoreError(res: Response, err: unknown, operation: string): void {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[items] ${operation} failed:`, err);

  res.status(500).json({
    error: "store_error",
    message: `Failed to ${operation}: ${detail}`,
  });
}

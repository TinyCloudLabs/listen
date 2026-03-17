import { type FC, useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient } from "@tinyboilerplate/client";
import type {
  Item,
  ItemListResponse,
  ItemResponse,
  StoreType,
} from "@tinyboilerplate/core";

interface ItemsCRUDProps {
  api: ApiClient | null;
}

export const ItemsCRUD: FC<ItemsCRUDProps> = ({ api }) => {
  const [storeType, setStoreType] = useState<StoreType>(
    () => (localStorage.getItem("tinyboilerplate:storeType") as StoreType) || "kv",
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newData, setNewData] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editData, setEditData] = useState("");

  // SQL-specific state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const enabled = api !== null;

  // ── Fetch items ───────────────────────────────────────────────────

  // Track the latest fetch to prevent stale responses from overwriting
  const fetchIdRef = useRef(0);

  const fetchItems = useCallback(async () => {
    if (!api) return;

    const id = ++fetchIdRef.current;
    setItems([]);
    setLoading(true);
    setError(null);
    setSqlQuery(null);
    setRowCount(null);

    try {
      let path = `/api/items?store=${storeType}`;
      if (storeType === "sql") {
        if (search) path += `&search=${encodeURIComponent(search)}`;
        path += `&sort=${sortBy}&dir=${sortDir}`;
      }
      const res = await api.get<ItemListResponse & { sql?: string; rowCount?: number }>(path);
      // Only apply if this is still the latest fetch
      if (id !== fetchIdRef.current) return;
      setItems(res.items);
      setLastResponse(res);
      if (res.sql) setSqlQuery(res.sql);
      if (res.rowCount != null) setRowCount(res.rowCount);
    } catch (err) {
      if (id !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [api, storeType, search, sortBy, sortDir]);

  useEffect(() => {
    if (enabled) {
      fetchItems();
    } else {
      setItems([]);
      setLastResponse(null);
      setLoading(false);
    }
  }, [enabled, fetchItems]);

  // ── Create item ───────────────────────────────────────────────────

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!api || !newTitle.trim()) return;

      setLoading(true);
      setError(null);

      try {
        const body: { title: string; data?: string } = {
          title: newTitle.trim(),
        };
        if (newData.trim()) body.data = newData.trim();

        const res = await api.post<ItemResponse>(
          `/api/items?store=${storeType}`,
          body,
        );
        setLastResponse(res);
        setNewTitle("");
        setNewData("");
        // Optimistic: add to list immediately
        if (res.item) {
          setItems((prev) => [res.item, ...prev]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [api, newTitle, newData, storeType],
  );

  // ── Update item ───────────────────────────────────────────────────

  const handleUpdate = useCallback(
    async (id: string) => {
      if (!api) return;

      setLoading(true);
      setError(null);

      try {
        const body: { title?: string; data?: string } = {};
        if (editTitle.trim()) body.title = editTitle.trim();
        if (editData.trim()) body.data = editData.trim();

        const res = await api.put<ItemResponse>(
          `/api/items/${id}?store=${storeType}`,
          body,
        );
        setLastResponse(res);
        setEditingId(null);
        setEditTitle("");
        setEditData("");
        // Optimistic: update in list immediately
        if (res.item) {
          setItems((prev) => prev.map((i) => (i.id === id ? res.item : i)));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [api, editTitle, editData, storeType],
  );

  // ── Delete item ───────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      if (!api) return;

      setLoading(true);
      setError(null);

      try {
        await api.del(`/api/items/${id}?store=${storeType}`);
        setLastResponse({ deleted: id });
        // Optimistic: remove from list immediately
        setItems((prev) => prev.filter((i) => i.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [api, storeType],
  );

  // ── Start editing ─────────────────────────────────────────────────

  const startEdit = useCallback((item: Item) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditData(item.data ?? "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
    setEditData("");
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <section
      style={{
        ...styles.panel,
        ...(enabled ? {} : styles.panelDisabled),
      }}
    >
      <h2 style={styles.heading}>2. Items (CRUD)</h2>

      {!enabled ? (
        <p style={styles.description}>
          Sign in to manage items.
        </p>
      ) : (
        <>
          {/* Store type toggle */}
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Store:</span>
            <button
              onClick={() => { setStoreType("kv"); localStorage.setItem("tinyboilerplate:storeType", "kv"); setSqlQuery(null); setRowCount(null); setLastResponse(null); }}
              style={{
                ...styles.toggleButton,
                ...(storeType === "kv" ? styles.toggleActive : {}),
              }}
            >
              KV
            </button>
            <button
              onClick={() => { setStoreType("sql"); localStorage.setItem("tinyboilerplate:storeType", "sql"); setLastResponse(null); }}
              style={{
                ...styles.toggleButton,
                ...(storeType === "sql" ? styles.toggleActive : {}),
              }}
            >
              SQL
            </button>
            <button
              onClick={fetchItems}
              disabled={loading}
              style={styles.refreshButton}
            >
              Refresh
            </button>
          </div>

          {/* SQL controls */}
          {storeType === "sql" && (
            <div style={styles.sqlControls}>
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchItems()}
                style={styles.searchInput}
              />
              <div style={styles.sortControls}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={styles.select}
                >
                  <option value="created_at">Date Created</option>
                  <option value="updated_at">Date Updated</option>
                  <option value="title">Title</option>
                </select>
                <button
                  onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                  style={styles.sortDirButton}
                  title={sortDir === "asc" ? "Ascending" : "Descending"}
                >
                  {sortDir === "asc" ? "\u2191" : "\u2193"}
                </button>
              </div>
              {rowCount != null && (
                <span style={styles.rowCount}>{rowCount} row{rowCount !== 1 ? "s" : ""}</span>
              )}
            </div>
          )}

          {/* SQL query viewer */}
          {storeType === "sql" && sqlQuery && (
            <div style={styles.sqlViewer}>
              <code style={styles.sqlCode}>{sqlQuery}</code>
            </div>
          )}

          {/* Create form */}
          <form onSubmit={handleCreate} style={styles.createForm}>
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Data (optional)"
              value={newData}
              onChange={(e) => setNewData(e.target.value)}
              style={styles.input}
            />
            <button
              type="submit"
              disabled={loading || !newTitle.trim()}
              style={{
                ...styles.button,
                ...(loading || !newTitle.trim() ? styles.buttonDisabled : {}),
              }}
            >
              Create
            </button>
          </form>

          {/* Items list */}
          {loading && (
            <p style={styles.loadingText}>Loading items...</p>
          )}

          {!loading && items.length === 0 && (
            <p style={styles.emptyText}>
              No items yet. Create one above.
            </p>
          )}

          <div style={styles.itemList}>
            {items.map((item) => (
              <div key={item.id} style={styles.itemCard}>
                {editingId === item.id ? (
                  /* Edit mode */
                  <div style={styles.editForm}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={styles.inputSmall}
                      placeholder="Title"
                    />
                    <input
                      type="text"
                      value={editData}
                      onChange={(e) => setEditData(e.target.value)}
                      style={styles.inputSmall}
                      placeholder="Data"
                    />
                    <div style={styles.editActions}>
                      <button
                        onClick={() => handleUpdate(item.id)}
                        disabled={loading}
                        style={styles.buttonSmall}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={styles.buttonSmallSecondary}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div style={styles.itemContent}>
                      <strong style={styles.itemTitle}>{item.title}</strong>
                      {item.data && (
                        <span style={styles.itemData}>{item.data}</span>
                      )}
                      <span style={styles.itemId}>
                        {item.id.length > 12
                          ? `${item.id.slice(0, 8)}...`
                          : item.id}
                      </span>
                    </div>
                    <div style={styles.itemActions}>
                      <button
                        onClick={() => startEdit(item)}
                        style={styles.buttonSmallSecondary}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={loading}
                        style={styles.buttonSmallDanger}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Raw response viewer */}
          {lastResponse !== null && (
            <details style={styles.details}>
              <summary style={styles.summary}>Last API Response</summary>
              <pre style={styles.pre}>
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: 20,
    background: "#fafafa",
  },
  panelDisabled: {
    opacity: 0.5,
    pointerEvents: "none",
  },
  heading: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 12px",
  },
  description: {
    fontSize: 14,
    color: "#555",
    margin: 0,
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
    marginRight: 4,
  },
  toggleButton: {
    padding: "4px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#555",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 4,
    cursor: "pointer",
  },
  toggleActive: {
    color: "#fff",
    background: "#2563eb",
    borderColor: "#2563eb",
  },
  refreshButton: {
    marginLeft: "auto",
    padding: "4px 12px",
    fontSize: 12,
    color: "#555",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 4,
    cursor: "pointer",
  },
  createForm: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #ccc",
    borderRadius: 6,
    outline: "none",
  },
  inputSmall: {
    flex: 1,
    padding: "6px 10px",
    fontSize: 13,
    border: "1px solid #ccc",
    borderRadius: 4,
    outline: "none",
  },
  button: {
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  buttonSmall: {
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
    background: "#2563eb",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  buttonSmallSecondary: {
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 500,
    color: "#555",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 4,
    cursor: "pointer",
  },
  buttonSmallDanger: {
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
    background: "#dc2626",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    padding: 20,
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  itemCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
  },
  itemContent: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  itemData: {
    fontSize: 13,
    color: "#666",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemId: {
    fontSize: 11,
    color: "#aaa",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  itemActions: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
    marginLeft: 12,
  },
  editForm: {
    display: "flex",
    gap: 8,
    flex: 1,
    alignItems: "center",
  },
  editActions: {
    display: "flex",
    gap: 4,
    flexShrink: 0,
  },
  details: {
    marginTop: 16,
  },
  summary: {
    fontSize: 13,
    color: "#555",
    cursor: "pointer",
    userSelect: "none",
  },
  pre: {
    fontSize: 12,
    color: "#1a1a1a",
    background: "#f5f5f5",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: 12,
    overflow: "auto",
    maxHeight: 240,
    marginTop: 8,
  },
  error: {
    marginTop: 12,
    padding: "8px 12px",
    fontSize: 13,
    color: "#b91c1c",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 6,
  },
  sqlControls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    padding: "6px 10px",
    fontSize: 13,
    border: "1px solid #ccc",
    borderRadius: 6,
    outline: "none",
  },
  sortControls: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  select: {
    padding: "5px 8px",
    fontSize: 12,
    border: "1px solid #ccc",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
  },
  sortDirButton: {
    padding: "4px 8px",
    fontSize: 14,
    fontWeight: 700,
    color: "#555",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 4,
    cursor: "pointer",
    lineHeight: 1,
  },
  rowCount: {
    fontSize: 12,
    color: "#888",
    whiteSpace: "nowrap",
  },
  sqlViewer: {
    marginBottom: 12,
    padding: "8px 12px",
    background: "#1e1e2e",
    borderRadius: 6,
    overflow: "auto",
  },
  sqlCode: {
    fontSize: 12,
    color: "#a6e3a1",
    fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
};

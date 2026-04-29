import { type FC, useCallback, useState } from "react";
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

const APP_ID = "com.example.app";
const APP_KV_PREFIX = `${APP_ID}/`;
const APP_DATABASE = `${APP_ID}/items`;

const SQL_EXAMPLE_QUERIES = [
  {
    label: "Create table",
    sql: "CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, title TEXT NOT NULL, data TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  },
  {
    label: "Insert row",
    sql: "INSERT INTO items (id, title, data, created_at, updated_at) VALUES ('1', 'Hello', 'world', datetime('now'), datetime('now'))",
  },
  {
    label: "Select all",
    sql: "SELECT id, title, data, created_at, updated_at FROM items",
  },
  {
    label: "Search",
    sql: "SELECT id, title, data FROM items WHERE title LIKE '%Hello%'",
  },
  {
    label: "Update row",
    sql: "UPDATE items SET title = 'Updated', updated_at = datetime('now') WHERE id = '1'",
  },
  {
    label: "Delete row",
    sql: "DELETE FROM items WHERE id = '1'",
  },
];

const DUCKDB_EXAMPLE_QUERIES = [
  {
    label: "Create table",
    sql: "CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, title TEXT NOT NULL, data TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  },
  {
    label: "Insert row",
    sql: "INSERT INTO items VALUES ('1', 'Hello', 'world', current_timestamp::TEXT, current_timestamp::TEXT)",
  },
  {
    label: "Select all",
    sql: "SELECT id, title, data, created_at, updated_at FROM items",
  },
  {
    label: "Search",
    sql: "SELECT id, title, data FROM items WHERE title ILIKE '%Hello%'",
  },
  {
    label: "Update row",
    sql: "UPDATE items SET title = 'Updated', updated_at = current_timestamp::TEXT WHERE id = '1'",
  },
  {
    label: "Delete row",
    sql: "DELETE FROM items WHERE id = '1'",
  },
];

interface DirectStorageProps {
  tcw: TinyCloudWeb | null;
}

type DatabaseRunner = {
  query: (sql: string, params?: unknown[]) => Promise<any>;
  execute: (sql: string, params?: unknown[]) => Promise<any>;
};

function appSql(tcw: TinyCloudWeb): DatabaseRunner {
  const service = tcw.sql as DatabaseRunner & { db?: (name: string) => DatabaseRunner };
  return typeof service.db === "function" ? service.db(APP_DATABASE) : service;
}

function appDuckdb(tcw: TinyCloudWeb): DatabaseRunner {
  const service = tcw.duckdb as DatabaseRunner & { db?: (name: string) => DatabaseRunner };
  return typeof service.db === "function" ? service.db(APP_DATABASE) : service;
}

export const DirectStorage: FC<DirectStorageProps> = ({ tcw }) => {
  const [mode, setMode] = useState<"kv" | "sql" | "duckdb">("kv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);

  // KV state
  const [kvPrefix, setKvPrefix] = useState(APP_KV_PREFIX);
  const [kvKeys, setKvKeys] = useState<string[]>([]);
  const [kvSelectedKey, setKvSelectedKey] = useState<string | null>(null);
  const [kvValue, setKvValue] = useState<string | null>(null);
  const [kvPutKey, setKvPutKey] = useState(`${APP_KV_PREFIX}scratch`);
  const [kvPutValue, setKvPutValue] = useState("");

  // SQL state
  const [sqlInput, setSqlInput] = useState("");
  const [sqlResult, setSqlResult] = useState<any>(null);

  const enabled = tcw !== null;

  // ── KV handlers ───────────────────────────────────────────────────

  const handleKvList = useCallback(async () => {
    if (!tcw) return;
    setLoading(true);
    setError(null);
    try {
      const opts: { prefix?: string } = {};
      if (kvPrefix.trim()) opts.prefix = kvPrefix.trim();
      const result = await tcw.kv.list(opts);
      if (!result.ok) {
        setError(`KV list failed: ${result.error.message}`);
        return;
      }
      setKvKeys(result.data.keys);
      setLastResult(result.data);
      setKvSelectedKey(null);
      setKvValue(null);
    } finally {
      setLoading(false);
    }
  }, [tcw, kvPrefix]);

  const handleKvGet = useCallback(
    async (key: string) => {
      if (!tcw) return;
      setLoading(true);
      setError(null);
      try {
        const result = await tcw.kv.get(key);
        if (!result.ok) {
          setError(`KV get failed: ${result.error.message}`);
          return;
        }
        setKvSelectedKey(key);
        const data = result.data.data;
        setKvValue(typeof data === "string" ? data : JSON.stringify(data, null, 2));
        setLastResult(result.data);
      } finally {
        setLoading(false);
      }
    },
    [tcw],
  );

  const handleKvPut = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tcw || !kvPutKey.trim()) return;
      setLoading(true);
      setError(null);
      try {
        let value: unknown;
        try {
          value = JSON.parse(kvPutValue);
        } catch {
          value = kvPutValue;
        }
        const result = await tcw.kv.put(kvPutKey.trim(), value);
        if (!result.ok) {
          setError(`KV put failed: ${result.error.message}`);
          return;
        }
        setLastResult({ success: true, key: kvPutKey.trim() });
        setKvPutKey(`${APP_KV_PREFIX}scratch`);
        setKvPutValue("");
      } finally {
        setLoading(false);
      }
    },
    [tcw, kvPutKey, kvPutValue],
  );

  const handleKvDelete = useCallback(
    async (key: string) => {
      if (!tcw) return;
      setLoading(true);
      setError(null);
      try {
        const result = await tcw.kv.delete(key);
        if (!result.ok) {
          setError(`KV delete failed: ${result.error.message}`);
          return;
        }
        setLastResult({ deleted: key });
        setKvSelectedKey(null);
        setKvValue(null);
        setKvKeys((prev) => prev.filter((k) => k !== key));
      } finally {
        setLoading(false);
      }
    },
    [tcw],
  );

  // ── SQL handlers ──────────────────────────────────────────────────

  const handleSqlQuery = useCallback(async () => {
    if (!tcw || !sqlInput.trim()) return;
    setLoading(true);
    setError(null);
    setSqlResult(null);
    try {
      const result = await appSql(tcw).query(sqlInput.trim());
      if (!result.ok) {
        setError(`SQL query failed: ${result.error.message}`);
        return;
      }
      setSqlResult({ type: "query", ...result.data });
      setLastResult(result.data);
    } finally {
      setLoading(false);
    }
  }, [tcw, sqlInput]);

  const handleSqlExecute = useCallback(async () => {
    if (!tcw || !sqlInput.trim()) return;
    setLoading(true);
    setError(null);
    setSqlResult(null);
    try {
      const result = await appSql(tcw).execute(sqlInput.trim());
      if (!result.ok) {
        setError(`SQL execute failed: ${result.error.message}`);
        return;
      }
      setSqlResult({ type: "execute", ...result.data });
      setLastResult(result.data);
    } finally {
      setLoading(false);
    }
  }, [tcw, sqlInput]);

  // ── DuckDB handlers ───────────────────────────────────────────────

  const handleDuckdbQuery = useCallback(async () => {
    if (!tcw || !sqlInput.trim()) return;
    setLoading(true);
    setError(null);
    setSqlResult(null);
    try {
      const result = await appDuckdb(tcw).query(sqlInput.trim());
      if (!result.ok) {
        setError(`DuckDB query failed: ${result.error.message}`);
        return;
      }
      setSqlResult({ type: "query", ...result.data });
      setLastResult(result.data);
    } finally {
      setLoading(false);
    }
  }, [tcw, sqlInput]);

  const handleDuckdbExecute = useCallback(async () => {
    if (!tcw || !sqlInput.trim()) return;
    setLoading(true);
    setError(null);
    setSqlResult(null);
    try {
      const result = await appDuckdb(tcw).execute(sqlInput.trim());
      if (!result.ok) {
        setError(`DuckDB execute failed: ${result.error.message}`);
        return;
      }
      setSqlResult({ type: "execute", ...result.data });
      setLastResult(result.data);
    } finally {
      setLoading(false);
    }
  }, [tcw, sqlInput]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <section
      style={{
        ...styles.panel,
        ...(enabled ? {} : styles.panelDisabled),
      }}
    >
      <h2 style={styles.heading}>3. Direct Storage (Browser → TinyCloud)</h2>

      {!enabled ? (
        <p style={styles.description}>
          Sign in to use direct storage. Not available after session restore.
        </p>
      ) : (
        <>
          {/* Mode toggle */}
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Mode:</span>
            <button
              onClick={() => {
                setMode("kv");
                setError(null);
                setSqlResult(null);
              }}
              style={{
                ...styles.toggleButton,
                ...(mode === "kv" ? styles.toggleActive : {}),
              }}
            >
              KV
            </button>
            <button
              onClick={() => {
                setMode("sql");
                setError(null);
                setSqlResult(null);
                setKvSelectedKey(null);
                setKvValue(null);
              }}
              style={{
                ...styles.toggleButton,
                ...(mode === "sql" ? styles.toggleActive : {}),
              }}
            >
              SQL
            </button>
            <button
              onClick={() => {
                setMode("duckdb");
                setError(null);
                setSqlResult(null);
                setKvSelectedKey(null);
                setKvValue(null);
              }}
              style={{
                ...styles.toggleButton,
                ...(mode === "duckdb" ? styles.toggleActive : {}),
              }}
            >
              DuckDB
            </button>
          </div>

          {mode === "kv" && (
            <>
              {/* List keys */}
              <div style={styles.kvListRow}>
                <input
                  type="text"
                  placeholder="Prefix filter (optional)"
                  value={kvPrefix}
                  onChange={(e) => setKvPrefix(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleKvList()}
                  style={styles.input}
                />
                <button onClick={handleKvList} disabled={loading} style={styles.button}>
                  List Keys
                </button>
              </div>

              {/* Keys list */}
              {kvKeys.length > 0 && (
                <div style={styles.keysList}>
                  {kvKeys.map((key) => (
                    <div
                      key={key}
                      onClick={() => handleKvGet(key)}
                      style={{
                        ...styles.keyItem,
                        ...(kvSelectedKey === key ? styles.keyItemActive : {}),
                      }}
                    >
                      {key}
                    </div>
                  ))}
                </div>
              )}

              {kvKeys.length === 0 && lastResult !== null && mode === "kv" && (
                <p style={styles.emptyText}>No keys found.</p>
              )}

              {/* Selected key value */}
              {kvSelectedKey && kvValue !== null && (
                <div style={styles.valueDisplay}>
                  <div style={styles.valueHeader}>
                    <code style={styles.valueKey}>{kvSelectedKey}</code>
                    <button
                      onClick={() => handleKvDelete(kvSelectedKey)}
                      disabled={loading}
                      style={styles.buttonSmallDanger}
                    >
                      Delete
                    </button>
                  </div>
                  <pre style={styles.valueContent}>{kvValue}</pre>
                </div>
              )}

              {/* Put form */}
              <form onSubmit={handleKvPut} style={styles.putForm}>
                <input
                  type="text"
                  placeholder="Key"
                  value={kvPutKey}
                  onChange={(e) => setKvPutKey(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="Value (JSON or string)"
                  value={kvPutValue}
                  onChange={(e) => setKvPutValue(e.target.value)}
                  style={styles.input}
                />
                <button
                  type="submit"
                  disabled={loading || !kvPutKey.trim()}
                  style={{
                    ...styles.button,
                    ...(loading || !kvPutKey.trim() ? styles.buttonDisabled : {}),
                  }}
                >
                  Put
                </button>
              </form>
            </>
          )}

          {(mode === "sql" || mode === "duckdb") && (
            <>
              {/* Example queries */}
              <div style={styles.exampleRow}>
                <span style={styles.exampleLabel}>Examples:</span>
                {(mode === "duckdb" ? DUCKDB_EXAMPLE_QUERIES : SQL_EXAMPLE_QUERIES).map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => setSqlInput(ex.sql)}
                    style={styles.exampleButton}
                    title={ex.sql}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              {/* SQL/DuckDB input */}
              <textarea
                placeholder={
                  mode === "duckdb"
                    ? "Enter DuckDB SQL (e.g. SELECT * FROM items)"
                    : "Enter SQL (e.g. SELECT * FROM items)"
                }
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                style={styles.sqlTextarea}
                rows={3}
              />
              <div style={styles.sqlButtons}>
                <button
                  onClick={mode === "duckdb" ? handleDuckdbQuery : handleSqlQuery}
                  disabled={loading || !sqlInput.trim()}
                  style={{
                    ...styles.button,
                    ...(loading || !sqlInput.trim() ? styles.buttonDisabled : {}),
                  }}
                >
                  Query (SELECT)
                </button>
                <button
                  onClick={mode === "duckdb" ? handleDuckdbExecute : handleSqlExecute}
                  disabled={loading || !sqlInput.trim()}
                  style={{
                    ...styles.buttonSecondary,
                    ...(loading || !sqlInput.trim() ? styles.buttonDisabled : {}),
                  }}
                >
                  Execute (DDL/DML)
                </button>
              </div>

              {/* Query results */}
              {sqlResult?.type === "query" && sqlResult.columns && (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {sqlResult.columns.map((col: string) => (
                          <th key={col} style={styles.th}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.rows.map((row: unknown[], i: number) => (
                        <tr key={i}>
                          {row.map((cell: unknown, j: number) => (
                            <td key={j} style={styles.td}>
                              {String(cell ?? "NULL")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <span style={styles.rowCount}>
                    {sqlResult.rowCount} row{sqlResult.rowCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {sqlResult?.type === "execute" && (
                <p style={styles.executeResult}>
                  {sqlResult.changes} row(s) affected.
                  {sqlResult.lastInsertRowId != null &&
                    ` Last insert ID: ${sqlResult.lastInsertRowId}`}
                </p>
              )}
            </>
          )}

          {/* Raw result viewer */}
          {lastResult !== null && (
            <details style={styles.details}>
              <summary style={styles.summary}>Last Raw Result</summary>
              <pre style={styles.pre}>{JSON.stringify(lastResult, null, 2)}</pre>
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

  // KV styles
  kvListRow: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #ccc",
    borderRadius: 6,
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
  buttonSecondary: {
    padding: "8px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#555",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
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
  keysList: {
    maxHeight: 200,
    overflowY: "auto",
    marginBottom: 12,
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    background: "#fff",
  },
  keyItem: {
    padding: "6px 10px",
    fontSize: 13,
    cursor: "pointer",
    borderBottom: "1px solid #f0f0f0",
    fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
  },
  keyItemActive: {
    background: "#e8f0fe",
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    padding: 12,
  },
  valueDisplay: {
    padding: 12,
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    marginBottom: 12,
  },
  valueHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  valueKey: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
    color: "#2563eb",
  },
  valueContent: {
    fontSize: 12,
    color: "#1a1a1a",
    background: "#f5f5f5",
    border: "1px solid #e0e0e0",
    borderRadius: 4,
    padding: 10,
    overflow: "auto",
    maxHeight: 200,
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  putForm: {
    display: "flex",
    gap: 8,
    marginTop: 12,
  },

  // SQL styles
  exampleRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
  },
  exampleButton: {
    padding: "3px 10px",
    fontSize: 11,
    color: "#2563eb",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 4,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  sqlTextarea: {
    width: "100%",
    minHeight: 60,
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
    border: "1px solid #ccc",
    borderRadius: 6,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 8,
  },
  sqlButtons: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  tableWrapper: {
    overflowX: "auto",
    marginBottom: 8,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "6px 10px",
    borderBottom: "2px solid #e0e0e0",
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
    background: "#fff",
  },
  td: {
    padding: "6px 10px",
    borderBottom: "1px solid #f0f0f0",
    fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
    fontSize: 12,
  },
  rowCount: {
    fontSize: 12,
    color: "#888",
  },
  executeResult: {
    fontSize: 13,
    color: "#555",
    margin: "0 0 8px",
  },

  // Shared
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
};

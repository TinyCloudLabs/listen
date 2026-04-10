import { useState, useEffect, useCallback, type FC } from "react";
import type { ApiClient } from "@tinyboilerplate/client";

// ── Types ────────────────────────────────────────────────────────────

export type AgentLane = "active" | "stale" | "archive";

export interface Agent {
  id: string;
  title: string;
  system_prompt: string | null;
  model: string | null;
  archived: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  lane: AgentLane;
  // Optional preview of last message — not currently sent by backend list
  // endpoint, but the chat POST response updates individual rows and might
  // be augmented later. Kept optional so forward-compat is trivial.
  last_message_preview?: string | null;
}

interface AgentsListResponse {
  agents: Agent[];
}

interface AgentResponse {
  agent: Agent;
}

interface AgentKanbanProps {
  api: ApiClient;
  backendUrl: string;
  getAccessToken: () => string | null;
  onSelectAgent: (id: string) => void;
  refreshKey?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "never";
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function preview(str: string | null | undefined, max = 80): string {
  if (!str) return "";
  const clean = str.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "\u2026" : clean;
}

// Lane classification is duplicated here only for client-side re-derivation
// when we mutate locally (e.g. archive toggle). Backend-provided `lane` is
// trusted on initial load.
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
const STALE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function classifyLane(agent: Agent, now = Date.now()): AgentLane {
  if (agent.archived === 1) return "archive";
  if (!agent.last_message_at) return "active";
  const t = new Date(agent.last_message_at).getTime();
  if (Number.isNaN(t)) return "active";
  const age = now - t;
  if (age < ACTIVE_WINDOW_MS) return "active";
  if (age < STALE_WINDOW_MS) return "stale";
  return "archive";
}

// ── Component ────────────────────────────────────────────────────────

export const AgentKanban: FC<AgentKanbanProps> = ({
  api,
  backendUrl,
  getAccessToken,
  onSelectAgent,
  refreshKey,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await api.get<AgentsListResponse>("/api/agents");
      setAgents(res.agents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    setLoading(true);
    fetchAgents().finally(() => setLoading(false));
  }, [fetchAgents, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const res = await api.post<AgentResponse>("/api/agents", { title });
      setAgents((prev) => [res.agent, ...prev]);
      setNewTitle("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  // PATCH via raw fetch because ApiClient doesn't expose a patch() method.
  const patchAgent = async (id: string, body: Record<string, unknown>): Promise<Agent> => {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`${backendUrl}/api/agents/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Requested-With": "TinyBoilerplate",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`API error (${res.status}): ${errBody.message ?? res.statusText}`);
    }
    const json = (await res.json()) as AgentResponse;
    return json.agent;
  };

  const handleToggleArchive = async (agent: Agent) => {
    setBusyId(agent.id);
    try {
      const archived = agent.archived !== 1;
      const updated = await patchAgent(agent.id, { archived });
      const reclassified: Agent = { ...updated, lane: classifyLane(updated) };
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? reclassified : a)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const byLane: Record<AgentLane, Agent[]> = { active: [], stale: [], archive: [] };
  for (const a of agents) byLane[a.lane].push(a);

  const renderCard = (agent: Agent) => {
    const hovered = hoveredId === agent.id;
    const busy = busyId === agent.id;
    return (
      <li
        key={agent.id}
        style={s.card}
        onMouseEnter={() => setHoveredId(agent.id)}
        onMouseLeave={() => setHoveredId((id) => (id === agent.id ? null : id))}
        onClick={() => onSelectAgent(agent.id)}
      >
        <div style={s.cardTop}>
          <span style={s.cardTitle}>{agent.title}</span>
          <span style={s.cardTime}>{formatRelative(agent.last_message_at)}</span>
        </div>
        {agent.last_message_preview ? (
          <p style={s.cardPreview}>{preview(agent.last_message_preview)}</p>
        ) : (
          <p style={s.cardPreviewMuted}>No messages yet</p>
        )}
        {hovered && (
          <button
            style={s.archiveBtn}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleArchive(agent);
            }}
          >
            {busy ? "\u2026" : agent.archived === 1 ? "Unarchive" : "Archive"}
          </button>
        )}
      </li>
    );
  };

  const renderLane = (lane: AgentLane, label: string, extra?: React.ReactNode) => (
    <section key={lane} style={s.lane}>
      <div style={s.laneHeader}>
        <span style={s.laneLabel}>{label}</span>
        <span style={s.laneCount}>{byLane[lane].length}</span>
      </div>
      {extra}
      {byLane[lane].length === 0 && !extra ? (
        <p style={s.laneEmpty}>empty</p>
      ) : (
        <ul style={s.list}>{byLane[lane].map(renderCard)}</ul>
      )}
    </section>
  );

  if (loading) {
    return (
      <div style={s.loadingCard}>
        <div style={s.loadingDots}>
          <span style={{ ...s.loadingDot, animationDelay: "0s" }} />
          <span style={{ ...s.loadingDot, animationDelay: "0.15s" }} />
          <span style={{ ...s.loadingDot, animationDelay: "0.3s" }} />
        </div>
        <p style={s.loadingText}>Loading agents</p>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {error && (
        <div style={s.errorCard}>
          <span style={s.errorIcon}>!</span>
          {error}
        </div>
      )}

      <div style={s.lanes}>
        {renderLane(
          "active",
          "Active",
          <form style={s.newForm} onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="New agent name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={s.newInput}
              disabled={creating}
            />
            <button
              type="submit"
              style={{
                ...s.newBtn,
                ...(creating || !newTitle.trim() ? s.newBtnDisabled : {}),
              }}
              disabled={creating || !newTitle.trim()}
            >
              {creating ? "\u2026" : "Create"}
            </button>
          </form>,
        )}
        {renderLane("stale", "Stale")}
        {renderLane("archive", "Archive")}
      </div>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  wrap: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  lanes: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  lane: {
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
    padding: "12px 12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 200,
  },
  laneHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 4px",
  },
  laneLabel: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  laneCount: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 500,
    color: "#9ca3af",
    background: "#f3f4f6",
    padding: "1px 6px",
    borderRadius: 4,
  },
  laneEmpty: {
    fontFamily: FONT,
    fontSize: 12,
    color: "#c0c4cc",
    textAlign: "center" as const,
    margin: "18px 0",
    fontStyle: "italic" as const,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  card: {
    position: "relative" as const,
    padding: "10px 12px",
    background: "#fafafa",
    border: "1px solid #f3f4f6",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.12s, border-color 0.12s",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#18181b",
    letterSpacing: "-0.01em",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  cardTime: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 400,
    color: "#9ca3af",
    flexShrink: 0,
  },
  cardPreview: {
    fontSize: 12,
    color: "#6b7280",
    margin: 0,
    lineHeight: 1.4,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
  },
  cardPreviewMuted: {
    fontSize: 12,
    color: "#c0c4cc",
    margin: 0,
    fontStyle: "italic" as const,
  },
  archiveBtn: {
    position: "absolute" as const,
    top: 6,
    right: 6,
    fontFamily: FONT,
    fontSize: 10,
    fontWeight: 500,
    color: "#6b7280",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 6,
    padding: "2px 8px",
    cursor: "pointer",
  },
  newForm: {
    display: "flex",
    gap: 6,
    marginBottom: 6,
  },
  newInput: {
    fontFamily: FONT,
    flex: 1,
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #e2e4e9",
    borderRadius: 6,
    outline: "none",
    color: "#18181b",
    background: "#fff",
  },
  newBtn: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
    background: "#6366f1",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },
  newBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  loadingCard: {
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 14,
    padding: "40px 20px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderRadius: 12,
  },
  loadingDots: {
    display: "flex",
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#6366f1",
    animation: "syncPulse 1s ease-in-out infinite",
  },
  loadingText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    margin: 0,
  },
  errorCard: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "12px 16px",
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
};

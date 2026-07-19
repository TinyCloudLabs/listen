import { useEffect, useRef, useState, type FC } from "react";
import type { TinyCloudWeb, HookEvent } from "@tinycloud/web-sdk";

// ── Types ────────────────────────────────────────────────────────────

interface LiveWriteEventsProps {
  tcw: TinyCloudWeb | null;
  spaceId?: string | null;
  pathPrefix: string | null;
  onWrite: () => void;
  onError?: (error: unknown) => void;
}

type Status = "idle" | "connecting" | "live" | "error";

const MAX_EVENTS = 20;

// Scope we subscribe to: writes to the user's own conversations SQL space.
const SUBSCRIPTION_SERVICE = "sql" as const;
const SUBSCRIPTION_ABILITIES = ["tinycloud.sql/write"];

// ── Helpers ──────────────────────────────────────────────────────────

function relativeTime(isoTimestamp: string, nowMs: number): string {
  const eventMs = Date.parse(isoTimestamp);
  if (Number.isNaN(eventMs)) return isoTimestamp;
  const deltaSec = Math.max(0, Math.round((nowMs - eventMs) / 1000));
  if (deltaSec < 2) return "just now";
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.round(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.round(deltaMin / 60);
  if (deltaHr < 24) return `${deltaHr}h ago`;
  return new Date(eventMs).toLocaleString();
}

function shortPath(path: string | undefined, maxLen: number): string {
  if (!path) return "—";
  if (path.length <= maxLen) return path;
  return `…${path.slice(-(maxLen - 1))}`;
}

function actorTail(actor: string): string {
  return actor.length <= 6 ? actor : actor.slice(-6);
}

function statusLabel(status: Status): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "connecting":
      return "Connecting";
    case "live":
      return "Live";
    case "error":
      return "Error";
  }
}

function statusAccent(status: Status): string {
  switch (status) {
    case "idle":
      return "var(--lst-ink-55)";
    case "connecting":
      return "var(--lst-warn)";
    case "live":
      return "var(--lst-ok)";
    case "error":
      return "var(--lst-alert)";
  }
}

// ── Component ────────────────────────────────────────────────────────

export const LiveWriteEvents: FC<LiveWriteEventsProps> = ({
  tcw,
  spaceId,
  pathPrefix,
  onWrite,
  onError,
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [events, setEvents] = useState<HookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // Keep `onWrite` in a ref so the subscribe effect doesn't re-run on every
  // parent re-render that produces a new callback identity.
  const onWriteRef = useRef(onWrite);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onWriteRef.current = onWrite;
  }, [onWrite]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Tick once a second so relative timestamps in the list stay fresh.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Subscribe to the user's write events whenever we have a signed-in tcw
  // with a known spaceId. The subscription lifetime is bound to the tcw
  // instance identity — signing out or re-signing-in produces a new tcw,
  // which tears down the old stream and starts a fresh one.
  useEffect(() => {
    if (!tcw || !pathPrefix) {
      setStatus("idle");
      setEvents([]);
      setError(null);
      return;
    }

    const space = spaceId ?? tcw.spaceId;
    if (!space) {
      // tcw exists but has no space yet. Stay idle until a valid instance
      // arrives; do NOT silently retry — if this keeps happening the caller
      // is wiring the component before sign-in completes.
      setStatus("idle");
      return;
    }

    const ctrl = new AbortController();
    let cancelled = false;
    let sawFirstEvent = false;

    setStatus("connecting");
    setError(null);

    (async () => {
      try {
        const stream = tcw.hooks.subscribe(
          [
            {
              space,
              service: SUBSCRIPTION_SERVICE,
              pathPrefix,
              abilities: SUBSCRIPTION_ABILITIES,
            },
          ],
          { signal: ctrl.signal },
        );

        for await (const ev of stream) {
          if (cancelled) break;
          if (!sawFirstEvent) {
            sawFirstEvent = true;
            setStatus("live");
          }
          setEvents((prev) => {
            const next = [ev, ...prev];
            return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
          });
          onWriteRef.current();
        }

        // Stream ended without a throw. If we weren't cancelled, treat that
        // as an unexpected close — surface it, don't silently go idle.
        if (!cancelled) {
          setStatus("error");
          setError("Live event stream closed unexpectedly");
        }
      } catch (err) {
        // Aborts triggered by our own cleanup are expected — they are not
        // errors. Any other throw is real and surfaces in the UI.
        if (ctrl.signal.aborted) return;
        onErrorRef.current?.(err);
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
    // We intentionally depend only on `tcw` identity. status/events are
    // updated from within and must not retrigger the subscribe loop.
  }, [tcw, pathPrefix, spaceId]);

  // ── Render ──────────────────────────────────────────────────────────

  if (!tcw) {
    return (
      <section style={s.panel}>
        <div style={s.headerRow}>
          <div style={s.titleGroup}>
            <h3 style={s.heading}>Live Writes</h3>
          </div>
        </div>
        <p style={s.mutedNote}>Live events require a fresh sign-in.</p>
      </section>
    );
  }

  const accent = statusAccent(status);
  const panelStyle: React.CSSProperties = { ...s.panel, borderLeft: `3px solid ${accent}` };

  return (
    <section style={panelStyle}>
      <div style={s.headerRow}>
        <div style={s.titleGroup}>
          <h3 style={s.heading}>Live Writes</h3>
        </div>
        <div style={s.statusPill}>
          <span
            style={{
              ...s.statusDot,
              background: accent,
              animation: status === "live" ? "syncPulse 2.5s ease-in-out infinite" : "none",
            }}
          />
          <span style={{ ...s.statusText, color: accent }}>{statusLabel(status)}</span>
        </div>
      </div>

      {status === "error" && error && (
        <div style={s.errorCard}>
          <span style={s.errorIcon}>!</span>
          <span>{error}</span>
        </div>
      )}

      {events.length === 0 ? (
        <p style={s.mutedNote}>
          {status === "live" || status === "connecting" ? "Waiting for writes…" : "No events yet."}
        </p>
      ) : (
        <ul style={s.list}>
          {events.map((ev) => (
            <li key={ev.id} style={s.listItem}>
              <div style={s.listItemTop}>
                <code style={s.ability}>{ev.ability}</code>
                <span style={s.timestamp}>{relativeTime(ev.timestamp, now)}</span>
              </div>
              <div style={s.listItemBottom}>
                <code style={s.path}>{shortPath(ev.path, 42)}</code>
                <code style={s.actor}>{actorTail(ev.actor)}</code>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  panel: {
    fontFamily: FONT,
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 0,
    padding: "18px 20px",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  heading: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 400,
    color: "var(--lst-blue)",
    margin: 0,
    letterSpacing: 0,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    background: "var(--lst-ink-08)",
    padding: "3px 8px",
    borderRadius: 999,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
  },
  statusText: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0,
  },
  mutedNote: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-ink-55)",
    margin: "10px 0 0",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "12px 0 0",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  listItem: {
    padding: "8px 10px",
    background: "var(--lst-ink-08)",
    border: "var(--lst-hair)",
    borderRadius: 0,
  },
  listItemTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  listItemBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  ability: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--lst-ink-70)",
    letterSpacing: "0.02em",
  },
  timestamp: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
  path: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-70)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    maxWidth: "60%",
  },
  actor: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
  },
  errorCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: "10px 14px",
    fontSize: 13,
    color: "var(--lst-alert)",
    background: "var(--lst-alert-soft)",
    border: "1px solid var(--lst-alert)",
    borderRadius: 0,
    lineHeight: 1.4,
  },
  errorIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "var(--lst-alert)",
    color: "var(--lst-bg)",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
};

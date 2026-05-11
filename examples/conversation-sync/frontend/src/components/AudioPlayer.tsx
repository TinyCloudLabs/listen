import { useState, type FC } from "react";

// ── Stub presentational audio player ─────────────────────────────────
// Backend does not yet expose audio. This is a UI-only stub matching
// the l-app-screens.jsx (line 100) handoff: play button, scrubber, time,
// and speed controls. No audio playback is wired.

interface AudioPlayerProps {
  durationSecs: number;
}

function formatClock(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

const SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export const AudioPlayer: FC<AudioPlayerProps> = ({ durationSecs }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0.34);
  const [speedIdx, setSpeedIdx] = useState(1);

  const currentSecs = durationSecs * progress;

  return (
    <div style={s.row}>
      <button
        style={s.playBtn}
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <span style={s.pauseGlyph}>
            <span style={s.pauseBar} />
            <span style={s.pauseBar} />
          </span>
        ) : (
          <span style={s.playGlyph} />
        )}
      </button>
      <span style={s.clock}>{formatClock(currentSecs)}</span>
      <div
        style={s.timeline}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          setProgress(Math.max(0, Math.min(1, ratio)));
        }}
      >
        <div style={{ ...s.timelineProg, width: `${progress * 100}%` }} />
        <div style={{ ...s.timelineHandle, left: `${progress * 100}%` }} />
      </div>
      <span style={s.clock}>{formatClock(durationSecs)}</span>
      <button
        style={s.iconBtn}
        onClick={() => setSpeedIdx((i) => Math.max(0, i - 1))}
        aria-label="Slower"
      >
        −
      </button>
      <span style={s.speed}>{SPEEDS[speedIdx].toFixed(SPEEDS[speedIdx] % 1 === 0 ? 1 : 2)}×</span>
      <button
        style={s.iconBtn}
        onClick={() => setSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1))}
        aria-label="Faster"
      >
        +
      </button>
    </div>
  );
};

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const s: Record<string, React.CSSProperties> = {
  row: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  playGlyph: {
    width: 0,
    height: 0,
    borderTop: "5px solid transparent",
    borderBottom: "5px solid transparent",
    borderLeft: "8px solid var(--lst-bg)",
    marginLeft: 2,
  },
  pauseGlyph: {
    display: "inline-flex",
    gap: 2,
  },
  pauseBar: {
    width: 2.5,
    height: 10,
    background: "var(--lst-bg)",
  },
  clock: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-blue)",
    letterSpacing: "0.04em",
  },
  timeline: {
    flex: 1,
    height: 1,
    background: "var(--lst-ink-35)",
    position: "relative",
    cursor: "pointer",
  },
  timelineProg: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 1,
    background: "var(--lst-blue)",
  },
  timelineHandle: {
    position: "absolute",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: 10,
    height: 10,
    background: "var(--lst-blue)",
    borderRadius: "50%",
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    cursor: "pointer",
    fontFamily: FONT,
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
  },
  speed: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-blue)",
    minWidth: 36,
    textAlign: "center" as const,
  },
};

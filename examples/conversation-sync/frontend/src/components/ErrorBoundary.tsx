import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={s.container}>
          <div style={s.card}>
            <span style={s.icon}>!</span>
            <h2 style={s.heading}>Something went wrong</h2>
<<<<<<< HEAD
<<<<<<< HEAD
            <p style={s.message}>{this.state.error?.message || "An unexpected error occurred."}</p>
=======
            <p style={s.message}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
>>>>>>> 94871e9 (feat: full Fireflies pagination, SSE streaming sync, and frontend redesign)
=======
            <p style={s.message}>{this.state.error?.message || "An unexpected error occurred."}</p>
>>>>>>> 4ccbd94 (style: run Prettier on all conversation-sync files)
            <div style={s.btnRow}>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={s.btnPrimary}
              >
                Try again
              </button>
              <button onClick={() => window.location.reload()} style={s.btnGhost}>
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const FONT = "'Outfit', -apple-system, sans-serif";
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

const s: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: FONT,
    maxWidth: 480,
    margin: "80px auto",
    padding: "0 20px",
  },
  card: {
    textAlign: "center" as const,
    padding: "32px 28px",
    background: "#fff",
    border: "1px solid #e2e4e9",
    borderLeft: "3px solid #ef4444",
    borderRadius: 12,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#fef2f2",
    color: "#ef4444",
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
  },
  heading: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 700,
    color: "#18181b",
    margin: "0 0 8px",
    letterSpacing: "-0.01em",
  },
  message: {
    fontFamily: MONO,
    fontSize: 13,
    color: "#991b1b",
    margin: "0 0 20px",
    wordBreak: "break-word" as const,
    lineHeight: 1.5,
  },
  btnRow: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimary: {
    fontFamily: FONT,
    padding: "9px 20px",
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "#18181b",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnGhost: {
    fontFamily: FONT,
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e2e4e9",
    borderRadius: 8,
    cursor: "pointer",
  },
};

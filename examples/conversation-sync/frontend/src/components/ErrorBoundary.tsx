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
            <p style={s.message}>{this.state.error?.message || "An unexpected error occurred."}</p>
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

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

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
    background: "var(--lst-bg)",
    border: "var(--lst-border)",
    borderRadius: 0,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
  },
  heading: {
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 400,
    color: "var(--lst-blue)",
    margin: "0 0 8px",
    letterSpacing: 0,
  },
  message: {
    fontFamily: MONO,
    fontSize: 13,
    color: "var(--lst-blue)",
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
    color: "var(--lst-bg)",
    background: "var(--lst-blue)",
    border: "var(--lst-border)",
    borderRadius: 999,
    cursor: "pointer",
  },
  btnGhost: {
    fontFamily: FONT,
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    background: "transparent",
    border: "var(--lst-border)",
    borderRadius: 999,
    cursor: "pointer",
  },
};

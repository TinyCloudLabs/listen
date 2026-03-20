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
        <div style={styles.container}>
          <h2 style={styles.heading}>Something went wrong</h2>
          <p style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            style={styles.retryButton}
          >
            Try again
          </button>
          <button onClick={() => window.location.reload()} style={styles.reloadButton}>
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: "80px auto",
    padding: 32,
    textAlign: "center",
    border: "1px solid #fecaca",
    borderRadius: 12,
    background: "#fef2f2",
  },
  heading: {
    fontSize: 20,
    fontWeight: 600,
    color: "#991b1b",
    margin: "0 0 8px",
  },
  message: {
    fontSize: 14,
    color: "#b91c1c",
    margin: "0 0 20px",
    wordBreak: "break-word",
  },
  retryButton: {
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    marginRight: 8,
  },
  reloadButton: {
    padding: "8px 20px",
    fontSize: 14,
    fontWeight: 500,
    color: "#555",
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
  },
};

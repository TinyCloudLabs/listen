import { useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────────────

export type ShellRoute = "inbox" | "chat" | "connections" | "sources";

export type ShellSourceKey = "fireflies" | "gmeet";

export interface ShellSourceConfig {
  key: ShellSourceKey;
  name: string;
  count: number | null;
}

export interface ShellFolderConfig {
  name: string;
  count: number;
}

export interface ShellUser {
  initials: string;
  name: string;
  plan: string;
}

interface AppShellProps {
  activeRoute: ShellRoute;
  onRouteChange: (route: ShellRoute) => void;
  pageEyebrow: string;
  pageTitle: string;
  topbarActions?: ReactNode;
  user: ShellUser;
  userMenu?: ReactNode;
  sources: ShellSourceConfig[];
  folders: ShellFolderConfig[];
  navCounts?: Partial<Record<Exclude<ShellRoute, "connections" | "sources">, number | null>>;
  children: ReactNode;
}

// ── Icons (mirrors l-shared.jsx LIcon) ──────────────────────────────

type IconName = "inbox" | "folder" | "sparkle" | "star" | "plus" | "search" | "settings" | "chev-d";

function ShellIcon({ name, size = 14 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "inbox":
      return (
        <svg {...common}>
          <path d="M3 13h5l1 3h6l1-3h5" />
          <path d="M5 5h14l2 8v6H3v-6z" />
        </svg>
      );
    case "folder":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 3l2.6 6 6.4.6-4.9 4.4 1.5 6.4L12 17l-5.6 3.4 1.5-6.4L3 9.6 9.4 9z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 15a7 7 0 0 0 0-6l2-1.5-2-3.4-2.4 1a7 7 0 0 0-5.2-3l-.4-2.6h-4l-.4 2.6a7 7 0 0 0-5.2 3l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 6l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 5.2 3l.4 2.6h4l.4-2.6a7 7 0 0 0 5.2-3l2.4 1 2-3.4z" />
        </svg>
      );
    case "chev-d":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
  }
  return null;
}

// ── Nav config ──────────────────────────────────────────────────────

interface NavItem {
  key: Exclude<ShellRoute, "connections" | "sources">;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { key: "inbox", label: "Inbox", icon: "inbox" },
  { key: "chat", label: "Chat", icon: "sparkle" },
];

// ── AppShell ────────────────────────────────────────────────────────

export const AppShell: FC<AppShellProps> = ({
  activeRoute,
  onRouteChange,
  pageEyebrow,
  pageTitle,
  topbarActions,
  user,
  userMenu,
  sources,
  folders,
  navCounts,
  children,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [userMenuOpen]);

  return (
    <div className="listen-shell">
      <aside className="listen-sidebar">
        {/* Brand + settings */}
        <div style={shell.brandRow}>
          <div style={shell.brandInner}>
            <span className="listen-brand-mark" />
            <span style={shell.brandWord}>listen</span>
          </div>
          <button
            type="button"
            style={shell.iconBtn}
            aria-label="Settings"
            onClick={() => onRouteChange("connections")}
          >
            <ShellIcon name="settings" size={12} />
          </button>
        </div>

        {/* Search */}
        <div style={shell.searchWrap}>
          <button
            type="button"
            style={shell.searchPill}
            onClick={() => onRouteChange("chat")}
            aria-label="Search transcripts"
          >
            <ShellIcon name="search" size={13} />
            <span style={shell.searchLabel}>Search transcripts</span>
            <span style={shell.searchKbd}>⌘K</span>
          </button>
        </div>

        {/* Source management */}
        <div style={shell.ctaWrap}>
          <button type="button" style={shell.ctaSolid} onClick={() => onRouteChange("connections")}>
            <ShellIcon name="plus" size={12} />
            <span>Add source or transcript</span>
          </button>
        </div>

        {/* Primary nav */}
        <nav style={shell.navWrap}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.key;
            const count = navCounts?.[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onRouteChange(item.key)}
                style={isActive ? shell.navRowActive : shell.navRow}
              >
                <ShellIcon name={item.icon} size={14} />
                <span style={shell.navLabel}>{item.label}</span>
                {count !== undefined && count !== null && (
                  <span style={isActive ? shell.navCountActive : shell.navCount}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {folders.length > 0 && (
          <>
            {/* Folders */}
            <div style={shell.sectionHeading}>
              <span style={shell.sectionDash}>— folders</span>
            </div>
            <div>
              {folders.map((folder) => (
                <button
                  key={folder.name}
                  type="button"
                  onClick={() => onRouteChange("inbox")}
                  style={shell.sideRow}
                >
                  <ShellIcon name="folder" size={13} />
                  <span style={shell.sideRowLabel}>{folder.name}</span>
                  <span style={shell.sideRowCount}>{folder.count}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Sources */}
        <div style={shell.sectionHeading}>
          <span style={shell.sectionDash}>— sources</span>
        </div>
        <div>
          {sources.map((source) => (
            <button
              key={source.key}
              type="button"
              onClick={() => onRouteChange("connections")}
              style={shell.sideRow}
            >
              <span style={shell.sourceDot} />
              <span style={shell.sideRowLabel}>{source.name}</span>
              {source.count !== null && <span style={shell.sideRowCount}>{source.count}</span>}
            </button>
          ))}
        </div>

        <div style={shell.userFooterWrap} ref={userMenuRef}>
          {userMenu && userMenuOpen && <div style={shell.userMenu}>{userMenu}</div>}
          <button
            type="button"
            style={shell.userFooterButton}
            onClick={() => userMenu && setUserMenuOpen((open) => !open)}
            aria-haspopup={userMenu ? "menu" : undefined}
            aria-expanded={userMenu ? userMenuOpen : undefined}
          >
            <div style={shell.avatar}>{user.initials}</div>
            <div style={shell.userMeta}>
              <div style={shell.userName}>{user.name}</div>
              <div style={shell.userPlan}>{user.plan}</div>
            </div>
            <ShellIcon name="chev-d" size={12} />
          </button>
        </div>
      </aside>

      <main className="listen-main">
        <header style={shell.topbar}>
          <div>
            <span style={shell.eyebrow}>— {pageEyebrow}</span>
            <h2 style={shell.pageTitle}>{pageTitle}</h2>
          </div>
          {topbarActions && <div style={shell.topbarActions}>{topbarActions}</div>}
        </header>

        <div className="listen-content">
          <div className="listen-stack">{children}</div>
        </div>
      </main>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";
const MONO = "var(--lst-mono)";

const shell: Record<string, CSSProperties> = {
  brandRow: {
    padding: "18px 20px 14px",
    borderBottom: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandInner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandWord: {
    fontFamily: FONT,
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: -0.4,
    color: "var(--lst-blue)",
    lineHeight: 1,
  },
  iconBtn: {
    fontFamily: FONT,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    border: "var(--lst-border)",
    background: "transparent",
    color: "var(--lst-blue)",
    borderRadius: 6,
    cursor: "pointer",
    padding: 0,
  },
  searchWrap: {
    padding: "14px 14px 6px",
  },
  searchPill: {
    fontFamily: FONT,
    width: "100%",
    display: "flex",
    alignItems: "center",
    border: "var(--lst-border)",
    background: "transparent",
    borderRadius: 999,
    padding: "6px 12px",
    gap: 8,
    color: "var(--lst-blue)",
    cursor: "pointer",
  },
  searchLabel: {
    fontFamily: FONT,
    fontSize: 13,
    opacity: 0.5,
    flex: 1,
  },
  searchKbd: {
    fontFamily: MONO,
    opacity: 0.45,
    fontSize: 10,
  },
  ctaWrap: {
    padding: "8px 8px",
  },
  ctaSolid: {
    fontFamily: FONT,
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "var(--lst-border)",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
  },
  navWrap: {
    padding: "14px 0 8px",
    display: "flex",
    flexDirection: "column",
  },
  navRow: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 20px",
    fontSize: 14,
    cursor: "pointer",
    background: "transparent",
    color: "var(--lst-blue)",
    border: "none",
    textAlign: "left",
    width: "100%",
  },
  navRowActive: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 20px",
    fontSize: 14,
    cursor: "pointer",
    background: "var(--lst-blue)",
    color: "var(--lst-bg)",
    border: "none",
    textAlign: "left",
    width: "100%",
  },
  navLabel: {
    flex: 1,
  },
  navCount: {
    fontFamily: MONO,
    opacity: 0.6,
    fontSize: 11,
    color: "var(--lst-blue)",
  },
  navCountActive: {
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-bg)",
    opacity: 0.85,
  },
  sectionHeading: {
    padding: "12px 20px 6px",
  },
  sectionDash: {
    fontFamily: MONO,
    opacity: 0.55,
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--lst-blue)",
  },
  sideRow: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 20px",
    fontSize: 13.5,
    opacity: 0.8,
    background: "transparent",
    color: "var(--lst-blue)",
    border: "none",
    textAlign: "left",
    width: "100%",
    cursor: "pointer",
  },
  sideRowLabel: {
    flex: 1,
  },
  sideRowCount: {
    fontFamily: MONO,
    opacity: 0.5,
    fontSize: 10,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--lst-blue)",
    display: "inline-block",
    flexShrink: 0,
  },
  userFooterWrap: {
    marginTop: "auto",
    position: "relative",
    borderTop: "var(--lst-border)",
  },
  userFooterButton: {
    fontFamily: FONT,
    width: "100%",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    background: "transparent",
    color: "var(--lst-blue)",
    cursor: "pointer",
    textAlign: "left",
  },
  userMenu: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: "calc(100% + 8px)",
    border: "var(--lst-border)",
    background: "var(--lst-bg)",
    boxShadow: "0 18px 50px rgba(28, 53, 184, 0.16)",
    maxHeight: "62vh",
    overflowY: "auto",
    zIndex: 5,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "var(--lst-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontFamily: MONO,
    color: "var(--lst-blue)",
    flexShrink: 0,
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontFamily: FONT,
    fontSize: 13,
    color: "var(--lst-blue)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userPlan: {
    fontFamily: MONO,
    opacity: 0.55,
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  topbar: {
    padding: "20px 32px 16px",
    borderBottom: "var(--lst-border)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 20,
    background: "var(--lst-bg)",
  },
  eyebrow: {
    display: "block",
    fontFamily: MONO,
    fontSize: 11,
    color: "var(--lst-ink-55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 7,
  },
  pageTitle: {
    fontFamily: FONT,
    fontSize: 38,
    fontWeight: 400,
    letterSpacing: 0,
    lineHeight: 1.06,
    margin: 0,
    color: "var(--lst-blue)",
  },
  topbarActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
};

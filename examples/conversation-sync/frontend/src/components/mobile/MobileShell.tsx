import type { CSSProperties, FC, ReactNode } from "react";

export type MobileTab = "inbox" | "library" | "chat" | "settings";

interface TabDef {
  key: MobileTab;
  label: string;
  glyph: string;
}

const TABS: TabDef[] = [
  { key: "inbox", label: "Inbox", glyph: "\u2709" },
  { key: "library", label: "Library", glyph: "\u25A4" },
  { key: "chat", label: "Chat", glyph: "\u2727" },
  { key: "settings", label: "Settings", glyph: "\u2699" },
];

interface MobileShellProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  children: ReactNode;
}

export const MobileShell: FC<MobileShellProps> = ({ activeTab, onTabChange, children }) => {
  return (
    <div style={s.shell}>
      <div style={s.content}>{children}</div>
      <nav style={s.tabBar} aria-label="Primary">
        {TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <button
              key={t.key}
              type="button"
              style={{ ...s.tab, ...(active ? s.tabActive : {}) }}
              onClick={() => onTabChange(t.key)}
              aria-current={active ? "page" : undefined}
            >
              <span style={s.tabGlyph}>{t.glyph}</span>
              <span style={s.tabLabel}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────

const FONT = "var(--lst-font)";

const s: Record<string, CSSProperties> = {
  shell: {
    fontFamily: FONT,
    background: "var(--lst-bg)",
    color: "var(--lst-blue)",
    height: "100dvh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "stretch",
    padding: "8px 14px calc(env(safe-area-inset-bottom, 0px) + 14px)",
    borderTop: "var(--lst-border)",
    background: "var(--lst-bg)",
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    border: "none",
    background: "transparent",
    color: "var(--lst-blue)",
    opacity: 0.55,
    padding: "6px 0",
    cursor: "pointer",
    fontFamily: FONT,
  },
  tabActive: {
    opacity: 1,
  },
  tabGlyph: {
    fontSize: 18,
    lineHeight: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 500,
  },
};

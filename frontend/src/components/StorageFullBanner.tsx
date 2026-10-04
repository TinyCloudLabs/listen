import type { CSSProperties, FC } from "react";
import {
  MANAGE_STORAGE_LABEL,
  MANAGE_STORAGE_URL,
  STORAGE_READ_ONLY_MESSAGE,
  STORAGE_READ_ONLY_TITLE,
} from "@listen/core";
import { useStorageFull } from "../lib/storageStatus";

interface StorageFullBannerProps {
  /** Float above the content instead of sitting in the page flow (mobile shell). */
  floating?: boolean;
}

/**
 * Persistent read-only notice while the owner's TinyCloud storage is full.
 * Not dismissible: it stays until the next successful save clears the state.
 */
export const StorageFullBanner: FC<StorageFullBannerProps> = ({ floating = false }) => {
  const storageFull = useStorageFull();
  if (!storageFull) return null;

  return (
    <div
      role="status"
      data-testid="storage-full-banner"
      style={floating ? { ...s.banner, ...s.floating } : s.banner}
    >
      <span style={s.text}>
        <strong style={s.title}>{STORAGE_READ_ONLY_TITLE}</strong> {STORAGE_READ_ONLY_MESSAGE}
      </span>
      <a href={MANAGE_STORAGE_URL} target="_blank" rel="noreferrer" style={s.link}>
        {MANAGE_STORAGE_LABEL}
      </a>
    </div>
  );
};

const FONT = "var(--lst-font)";

const s: Record<string, CSSProperties> = {
  banner: {
    fontFamily: FONT,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "12px 16px",
    background: "var(--lst-ink-08)",
    border: "var(--lst-border)",
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--lst-blue)",
    animation: "fadeSlideIn 0.3s ease-out",
  },
  floating: {
    position: "fixed",
    top: "calc(env(safe-area-inset-top, 0px) + 8px)",
    left: 8,
    right: 8,
    zIndex: 60,
    flexWrap: "wrap",
    background: "var(--lst-bg)",
  },
  text: {
    lineHeight: 1.45,
  },
  title: {
    fontWeight: 700,
  },
  link: {
    flexShrink: 0,
    color: "var(--lst-blue)",
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
};

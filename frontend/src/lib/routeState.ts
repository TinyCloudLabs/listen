import type { SourceFilter } from "../components/InboxFilters";

export type RoutePage = "inbox" | "shared" | "chat" | "connections" | "sources";

export interface RouteState {
  activePage: RoutePage;
  librarySourceFilter: SourceFilter;
  selectedConversationId: string | null;
}

export type RouteWriteMode = "push" | "replace";

const DEFAULT_ROUTE_STATE: RouteState = {
  activePage: "inbox",
  librarySourceFilter: "all",
  selectedConversationId: null,
};

const LIBRARY_SOURCES = new Set<SourceFilter>([
  "fireflies",
  "granola",
  "google-meet",
  "soundcore_sync",
  "otter",
  "manual",
  "recorder",
  "voice_memos",
  "voxterm",
]);

function decodePathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function isLibrarySource(value: string | null): value is Exclude<SourceFilter, "all"> {
  return value !== null && LIBRARY_SOURCES.has(value as SourceFilter);
}

export function parseRouteState(pathname = window.location.pathname): RouteState {
  const segments = pathSegments(pathname);

  if (segments.length === 0) return DEFAULT_ROUTE_STATE;

  if (segments.length === 2 && segments[0] === "library") {
    const source = decodePathSegment(segments[1]!);
    if (isLibrarySource(source)) {
      return {
        activePage: "inbox",
        librarySourceFilter: source,
        selectedConversationId: null,
      };
    }
    return DEFAULT_ROUTE_STATE;
  }

  if (segments.length === 2 && segments[0] === "t") {
    const conversationId = decodePathSegment(segments[1]!);
    if (conversationId) {
      return {
        activePage: "inbox",
        librarySourceFilter: "all",
        selectedConversationId: conversationId,
      };
    }
    return DEFAULT_ROUTE_STATE;
  }

  if (segments.length === 1) {
    switch (segments[0]) {
      case "chat":
        return { ...DEFAULT_ROUTE_STATE, activePage: "chat" };
      case "shared":
        return { ...DEFAULT_ROUTE_STATE, activePage: "shared" };
      case "settings":
        return { ...DEFAULT_ROUTE_STATE, activePage: "connections" };
      case "sources":
        return { ...DEFAULT_ROUTE_STATE, activePage: "sources" };
    }
  }

  return DEFAULT_ROUTE_STATE;
}

export function routeStateToPath(route: RouteState): string {
  if (route.selectedConversationId) {
    return `/t/${encodeURIComponent(route.selectedConversationId)}`;
  }

  switch (route.activePage) {
    case "inbox":
      return route.librarySourceFilter === "all"
        ? "/"
        : `/library/${encodeURIComponent(route.librarySourceFilter)}`;
    case "chat":
      return "/chat";
    case "shared":
      return "/shared";
    case "connections":
      return "/settings";
    case "sources":
      return "/sources";
  }
}

function shareHashFromLocation(location: Location): string {
  return location.hash.startsWith("#share=") ? location.hash : "";
}

export function routeStateToUrl(route: RouteState, location = window.location): string {
  return `${routeStateToPath(route)}${location.search}${shareHashFromLocation(location)}`;
}

export function writeRouteState(route: RouteState, mode: RouteWriteMode): void {
  const nextUrl = routeStateToUrl(route);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) return;

  const method = mode === "replace" ? "replaceState" : "pushState";
  window.history[method]({ listenRoute: true }, "", nextUrl);
}

export function subscribeToRouteState(callback: (route: RouteState) => void): () => void {
  const handlePopState = () => callback(parseRouteState());
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}

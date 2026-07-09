import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseRouteState,
  routeStateToPath,
  subscribeToRouteState,
  writeRouteState,
  type RouteState,
} from "../lib/routeState";

const defaultRoute: RouteState = {
  activePage: "inbox",
  librarySourceFilter: "all",
  selectedConversationId: null,
};

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("route state", () => {
  it("parses and formats known app routes", () => {
    const cases: Array<[string, RouteState]> = [
      ["/", defaultRoute],
      [
        "/library/fireflies",
        { activePage: "inbox", librarySourceFilter: "fireflies", selectedConversationId: null },
      ],
      [
        "/library/google-meet",
        { activePage: "inbox", librarySourceFilter: "google-meet", selectedConversationId: null },
      ],
      [
        "/library/soundcore_sync",
        {
          activePage: "inbox",
          librarySourceFilter: "soundcore_sync",
          selectedConversationId: null,
        },
      ],
      [
        "/t/conversation%2Fwith%20space",
        {
          activePage: "inbox",
          librarySourceFilter: "all",
          selectedConversationId: "conversation/with space",
        },
      ],
      ["/chat", { ...defaultRoute, activePage: "chat" }],
      ["/shared", { ...defaultRoute, activePage: "shared" }],
      ["/settings", { ...defaultRoute, activePage: "connections" }],
      ["/sources", { ...defaultRoute, activePage: "sources" }],
    ];

    for (const [path, route] of cases) {
      expect(parseRouteState(path)).toEqual(route);
      expect(parseRouteState(routeStateToPath(route))).toEqual(route);
    }
  });

  it("falls back to the unfiltered library for unknown paths and sources", () => {
    expect(parseRouteState("/missing")).toEqual(defaultRoute);
    expect(parseRouteState("/library/not-a-source")).toEqual(defaultRoute);
    expect(parseRouteState("/t")).toEqual(defaultRoute);
  });

  it("preserves an active share hash when writing route state", () => {
    window.history.replaceState(null, "", "/chat?debug=1#share=ls1%3Atoken");

    writeRouteState(
      { activePage: "inbox", librarySourceFilter: "fireflies", selectedConversationId: null },
      "replace",
    );

    expect(window.location.pathname).toBe("/library/fireflies");
    expect(window.location.search).toBe("?debug=1");
    expect(window.location.hash).toBe("#share=ls1%3Atoken");
  });

  it("notifies subscribers on popstate with the parsed route", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToRouteState(callback);

    window.history.pushState(null, "", "/settings");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(callback).toHaveBeenCalledWith({
      activePage: "connections",
      librarySourceFilter: "all",
      selectedConversationId: null,
    });

    unsubscribe();
  });
});

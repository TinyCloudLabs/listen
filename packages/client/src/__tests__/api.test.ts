import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createApiClient } from "../api.js";
import type { SessionStore } from "../tokens.js";

// ── Mock SessionStore ──────────────────────────────────────────────────

function createMockSessionStore(overrides?: Partial<SessionStore>): SessionStore {
  return {
    getToken: () => "test-token",
    hasSession: () => true,
    isExpired: () => false,
    setSession: () => {},
    clear: () => {},
    getAddress: () => "0xtest",
    ...overrides,
  } as SessionStore;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("createApiClient", () => {
  const backendUrl = "https://api.example.com";
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── GET ────────────────────────────────────────────────────────────

  test("get makes GET request with Bearer token", async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedInit = init;
      return new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore();
    const client = createApiClient(backendUrl, { sessionStore });

    await client.get("/users/1");

    expect(capturedUrl).toBe("https://api.example.com/users/1");
    expect(capturedInit?.method).toBe("GET");
    expect((capturedInit?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-token",
    );
    expect((capturedInit?.headers as Record<string, string>)["X-Requested-With"]).toBe(
      "TinyBoilerplate",
    );
  });

  // ── POST ───────────────────────────────────────────────────────────

  test("post makes POST request with JSON body and Bearer token", async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ id: 2 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore();
    const client = createApiClient(backendUrl, { sessionStore });

    await client.post("/users", { name: "Alice" });

    expect(capturedInit?.method).toBe("POST");
    expect((capturedInit?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect((capturedInit?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-token",
    );
    expect((capturedInit?.headers as Record<string, string>)["X-Requested-With"]).toBe(
      "TinyBoilerplate",
    );
    expect(capturedInit?.body).toBe(JSON.stringify({ name: "Alice" }));
  });

  // ── PUT ────────────────────────────────────────────────────────────

  test("put makes PUT request with JSON body", async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ id: 1, name: "Bob" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore();
    const client = createApiClient(backendUrl, { sessionStore });

    await client.put("/users/1", { name: "Bob" });

    expect(capturedInit?.method).toBe("PUT");
    expect((capturedInit?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect((capturedInit?.headers as Record<string, string>)["X-Requested-With"]).toBe(
      "TinyBoilerplate",
    );
    expect(capturedInit?.body).toBe(JSON.stringify({ name: "Bob" }));
  });

  // ── DELETE ─────────────────────────────────────────────────────────

  test("del makes DELETE request", async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore();
    const client = createApiClient(backendUrl, { sessionStore });

    await client.del("/users/1");

    expect(capturedInit?.method).toBe("DELETE");
    expect((capturedInit?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-token",
    );
    expect((capturedInit?.headers as Record<string, string>)["X-Requested-With"]).toBe(
      "TinyBoilerplate",
    );
  });

  // ── Parsed JSON response ──────────────────────────────────────────

  test("returns parsed JSON on success", async () => {
    const payload = { id: 1, name: "Alice", active: true };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore();
    const client = createApiClient(backendUrl, { sessionStore });

    const result = await client.get<{ id: number; name: string; active: boolean }>("/users/1");
    expect(result).toEqual(payload);
  });

  // ── Error handling ─────────────────────────────────────────────────

  test("throws on non-ok responses with error message", async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: "not_found", message: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore();
    const client = createApiClient(backendUrl, { sessionStore });

    await expect(client.get("/users/999")).rejects.toThrow("API error (404): User not found");
  });

  // ── 401 clears session ─────────────────────────────────────────────

  test("clears session on 401 and throws", async () => {
    let clearCalled = false;

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: "unauthorized", message: "Token expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore({
      clear: () => {
        clearCalled = true;
      },
    });

    const client = createApiClient(backendUrl, { sessionStore });

    await expect(client.get("/protected")).rejects.toThrow(
      "Session expired. Please sign in again.",
    );
    expect(clearCalled).toBe(true);
  });

  // ── 204 No Content ────────────────────────────────────────────────

  test("handles 204 No Content and returns undefined", async () => {
    globalThis.fetch = (async () => {
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const sessionStore = createMockSessionStore();
    const client = createApiClient(backendUrl, { sessionStore });

    const result = await client.del("/users/1");
    expect(result).toBeUndefined();
  });

  // ── No token available ────────────────────────────────────────────

  test("throws when no session token is available", async () => {
    const sessionStore = createMockSessionStore({
      getToken: () => null,
      isExpired: () => true,
    });

    const client = createApiClient(backendUrl, { sessionStore });

    await expect(client.get("/anything")).rejects.toThrow("Not authenticated. Please sign in.");
  });

  // ── Expired session ───────────────────────────────────────────────

  test("throws when session is expired", async () => {
    let clearCalled = false;

    const sessionStore = createMockSessionStore({
      getToken: () => "expired-token",
      isExpired: () => true,
      clear: () => {
        clearCalled = true;
      },
    });

    const client = createApiClient(backendUrl, { sessionStore });

    await expect(client.get("/anything")).rejects.toThrow("Session expired. Please sign in again.");
    expect(clearCalled).toBe(true);
  });
});

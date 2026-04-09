import { describe, test, expect, beforeEach } from "bun:test";
import { SessionStore } from "../tokens.js";

describe("SessionStore", () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  // ── setSession / getters ──────────────────────────────────────────────

  test("setSession stores session correctly", () => {
    store.setSession("token-123", 3600);

    expect(store.getToken()).toBe("token-123");
    expect(store.hasSession()).toBe(true);
  });

  test("setSession stores session with address", () => {
    store.setSession("token-123", 3600, "0xABC");

    expect(store.getToken()).toBe("token-123");
    expect(store.getAddress()).toBe("0xABC");
    expect(store.hasSession()).toBe(true);
  });

  test("getToken returns null when no session is set", () => {
    expect(store.getToken()).toBeNull();
  });

  // ── hasSession ────────────────────────────────────────────────────────

  test("hasSession returns false when no session is set", () => {
    expect(store.hasSession()).toBe(false);
  });

  test("hasSession returns true after session is set", () => {
    store.setSession("t", 3600);
    expect(store.hasSession()).toBe(true);
  });

  // ── isExpired ────────────────────────────────────────────────────────

  test("isExpired returns false for fresh session", () => {
    // 1 hour expiry — well outside the 30s buffer
    store.setSession("t", 3600);
    expect(store.isExpired()).toBe(false);
  });

  test("isExpired returns true when session is within 30s buffer of expiry", () => {
    // Set expiry to 20 seconds — within the 30s buffer
    store.setSession("t", 20);
    expect(store.isExpired()).toBe(true);
  });

  test("isExpired returns true when no session is set", () => {
    expect(store.isExpired()).toBe(true);
  });

  test("isExpired returns true when session is already expired", () => {
    // 0 seconds means expires immediately
    store.setSession("t", 0);
    expect(store.isExpired()).toBe(true);
  });

  // ── clear ────────────────────────────────────────────────────────────

  test("clear removes session", () => {
    store.setSession("t", 3600);
    expect(store.hasSession()).toBe(true);

    store.clear();

    expect(store.hasSession()).toBe(false);
    expect(store.getToken()).toBeNull();
    expect(store.isExpired()).toBe(true);
  });

  // ── getAddress ────────────────────────────────────────────────────────

  test("getAddress returns null when no session is set", () => {
    expect(store.getAddress()).toBeNull();
  });

  test("getAddress returns stored address", () => {
    store.setSession("t", 3600, "0xDEADBEEF");
    expect(store.getAddress()).toBe("0xDEADBEEF");
  });
});

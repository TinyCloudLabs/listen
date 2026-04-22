import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isFresh, readSessionCache, writeSessionCache } from "../lib/session-cache.js";

const scratch: string[] = [];
function scratchFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "listen-cache-test-"));
  scratch.push(dir);
  return join(dir, "session.json");
}

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("session-cache", () => {
  test("readSessionCache returns null for missing file", () => {
    expect(readSessionCache(scratchFile())).toBeNull();
  });

  test("write then read round-trip", () => {
    const path = scratchFile();
    writeSessionCache(path, {
      delegationFingerprint: "abc",
      activatedAt: 123,
      agentDid: "did:pkh:eip155:1:0xabc",
    });
    const read = readSessionCache(path);
    expect(read).toEqual({
      delegationFingerprint: "abc",
      activatedAt: 123,
      agentDid: "did:pkh:eip155:1:0xabc",
    });
  });

  test("readSessionCache returns null for malformed JSON", () => {
    const path = scratchFile();
    require("node:fs").writeFileSync(path, "not json");
    expect(readSessionCache(path)).toBeNull();
  });

  test("isFresh: null cache is never fresh", () => {
    expect(isFresh(null, "abc")).toBe(false);
  });

  test("isFresh: different fingerprint is not fresh", () => {
    expect(
      isFresh({ delegationFingerprint: "abc", activatedAt: Date.now(), agentDid: "did" }, "xyz"),
    ).toBe(false);
  });

  test("isFresh: within 50-min TTL is fresh", () => {
    const now = 1_000_000_000;
    const cache = {
      delegationFingerprint: "abc",
      activatedAt: now - 49 * 60 * 1000,
      agentDid: "did",
    };
    expect(isFresh(cache, "abc", now)).toBe(true);
  });

  test("isFresh: beyond 50-min TTL is stale", () => {
    const now = 1_000_000_000;
    const cache = {
      delegationFingerprint: "abc",
      activatedAt: now - 51 * 60 * 1000,
      agentDid: "did",
    };
    expect(isFresh(cache, "abc", now)).toBe(false);
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureAgentKey,
  generatePrivateKey,
  loadAgentKey,
  writeAgentKey,
} from "../lib/identity.js";

const scratch: string[] = [];
function scratchPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "tc-agent-id-test-"));
  scratch.push(dir);
  return join(dir, "agent-key.json");
}

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("identity", () => {
  test("generatePrivateKey produces 0x + 64 hex chars", () => {
    const k = generatePrivateKey();
    expect(k).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("generatePrivateKey produces distinct keys", () => {
    expect(generatePrivateKey()).not.toBe(generatePrivateKey());
  });

  test("loadAgentKey returns null for missing file", () => {
    expect(loadAgentKey(scratchPath())).toBeNull();
  });

  test("writeAgentKey + loadAgentKey round-trip", () => {
    const path = scratchPath();
    const key = { privateKey: generatePrivateKey() };
    writeAgentKey(path, key);
    expect(loadAgentKey(path)).toEqual(key);
  });

  test("writeAgentKey creates parent directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "tc-agent-id-test-"));
    scratch.push(dir);
    const nested = join(dir, "deep", "nested", "agent-key.json");
    writeAgentKey(nested, { privateKey: generatePrivateKey() });
    expect(existsSync(nested)).toBe(true);
  });

  test("writeAgentKey writes with 0600 perms", () => {
    const path = scratchPath();
    writeAgentKey(path, { privateKey: generatePrivateKey() });
    const mode = statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  test("ensureAgentKey generates on first call, reuses on second", () => {
    const path = scratchPath();
    const first = ensureAgentKey(path);
    expect(first.generated).toBe(true);
    const second = ensureAgentKey(path);
    expect(second.generated).toBe(false);
    expect(second.key.privateKey).toBe(first.key.privateKey);
  });

  test("loadAgentKey rejects malformed privateKey", () => {
    const path = scratchPath();
    require("node:fs").writeFileSync(path, JSON.stringify({ privateKey: "nope" }));
    expect(() => loadAgentKey(path)).toThrow(/Invalid agent key/);
  });
});

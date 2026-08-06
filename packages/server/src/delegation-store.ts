import type { TinyCloudNode } from "@tinycloud/node-sdk";
import type { StoredDelegation } from "@listen/core";
import { createHash, randomUUID } from "node:crypto";
import { withSessionRefresh } from "./identity.js";

// ── Types ────────────────────────────────────────────────────────────

export interface DelegationMetadata {
  grantedAt?: string;
  expiresAt: string;
  actions: string[];
  path: string;
  policyHash?: string;
  resources?: StoredDelegation["resources"];
}

// ── Delegation Store ─────────────────────────────────────────────────

/**
 * Persists and retrieves user delegations using the backend's own
 * TinyCloud KV store.
 *
 * Key format: `delegations/{identifier}` in the backend's KV space.
 */
export class DelegationStore {
  constructor(private readonly node: TinyCloudNode) {}

  /**
   * Store a serialized delegation for a user identifier.
   */
  async store(
    identifier: string,
    serialized: string,
    metadata: DelegationMetadata,
  ): Promise<StoredDelegation> {
    const key = this.keyFor(identifier);
    const record: StoredDelegation = {
      revision: randomUUID(),
      serialized,
      grantedAt: metadata.grantedAt ?? new Date().toISOString(),
      expiresAt: metadata.expiresAt,
      actions: metadata.actions,
      path: metadata.path,
      policyHash: metadata.policyHash,
      resources: metadata.resources,
    };

    const result = await withSessionRefresh(this.node, () => this.node.kv.put(key, record));
    assertKvWriteSucceeded(result, `store delegation for ${identifier}`);
    return record;
  }

  /**
   * Load the stored delegation for a user identifier.
   * Returns null if no delegation exists.
   */
  async load(identifier: string): Promise<StoredDelegation | null> {
    const key = this.keyFor(identifier);

    const result = await withSessionRefresh(this.node, () => this.node.kv.get(key));

    if (isFailedKvResult(result)) {
      if (isMissingKvResult(result)) return null;
      throw delegationStoreError(
        `Failed to load delegation for ${identifier}: ${describeKvError(result)}`,
        kvErrorCode(result),
      );
    }

    const response = extractKvData(result);
    if (response === null) return null;
    if (response === undefined) {
      throw delegationStoreError(
        `Failed to load delegation for ${identifier}: invalid successful KV response`,
        "delegation_store_invalid_response",
      );
    }

    try {
      // KV get returns { data: value } — unwrap it
      let raw =
        typeof response === "object" && response !== null && "data" in response
          ? (response as { data?: unknown }).data
          : response;
      if (raw === undefined) throw new Error("missing delegation record");
      if (typeof raw === "string") raw = JSON.parse(raw);

      // Validate required StoredDelegation fields
      const candidate = raw as {
        revision?: unknown;
        serialized?: unknown;
        grantedAt?: unknown;
        expiresAt?: unknown;
        actions?: unknown;
        path?: unknown;
        policyHash?: unknown;
        resources?: unknown;
      };
      if (
        typeof raw !== "object" ||
        raw === null ||
        (candidate.revision !== undefined &&
          (typeof candidate.revision !== "string" || candidate.revision.length === 0)) ||
        typeof candidate.serialized !== "string" ||
        typeof candidate.grantedAt !== "string" ||
        !Number.isFinite(new Date(candidate.grantedAt).getTime()) ||
        typeof candidate.expiresAt !== "string" ||
        !Number.isFinite(new Date(candidate.expiresAt).getTime()) ||
        !Array.isArray(candidate.actions) ||
        !candidate.actions.every((action: unknown) => typeof action === "string") ||
        typeof candidate.path !== "string" ||
        (candidate.policyHash !== undefined && typeof candidate.policyHash !== "string") ||
        (candidate.resources !== undefined && !Array.isArray(candidate.resources))
      ) {
        throw new Error("invalid delegation record shape");
      }

      return {
        ...(raw as Omit<StoredDelegation, "revision">),
        revision:
          typeof candidate.revision === "string"
            ? candidate.revision
            : legacyDelegationRevision(candidate),
      };
    } catch (err) {
      throw delegationStoreError(
        `Failed to load delegation for ${identifier}: ${
          err instanceof Error ? err.message : "invalid stored record"
        }`,
        "delegation_store_invalid_response",
      );
    }
  }

  /**
   * Remove the stored delegation for a user identifier.
   *
   * A successful delete is confirmed by loading the row afterward. This keeps
   * explicit DELETE honest when the node reports a failed or incomplete
   * deletion.
   */
  async remove(identifier: string): Promise<void> {
    const key = this.keyFor(identifier);

    const result = await withSessionRefresh(this.node, () => this.node.kv.delete(key));
    if (isFailedKvResult(result) && !isMissingKvResult(result)) {
      throw new Error(`Failed to delete delegation for ${identifier}: ${describeKvError(result)}`);
    }

    if ((await this.load(identifier)) !== null) {
      throw new Error(`Failed to delete delegation for ${identifier}: record still exists`);
    }
  }

  /**
   * Check whether a stored delegation exists and is not expired.
   */
  async isActive(identifier: string): Promise<boolean> {
    const stored = await this.load(identifier);
    if (!stored) return false;
    return new Date(stored.expiresAt).getTime() > Date.now();
  }

  private keyFor(identifier: string): string {
    if (
      !identifier ||
      identifier.includes("/") ||
      identifier.includes("\\") ||
      identifier.includes("..")
    ) {
      throw new Error("Invalid delegation identifier");
    }
    return `delegations/${identifier}`;
  }
}

function assertKvWriteSucceeded(result: unknown, operation: string): void {
  if (typeof result === "object" && result !== null && (result as { ok?: unknown }).ok === true) {
    return;
  }
  const message =
    isFailedKvResult(result) && result.error !== undefined
      ? describeKvError(result)
      : "invalid successful KV write response";
  throw delegationStoreError(
    `Failed to ${operation}: ${message}`,
    isFailedKvResult(result) ? kvErrorCode(result) : "delegation_store_invalid_response",
  );
}

function isFailedKvResult(result: unknown): result is { ok: false; error?: unknown } {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok?: unknown }).ok === false
  );
}

function isMissingKvResult(result: { error?: unknown }): boolean {
  if (typeof result.error !== "object" || result.error === null) return false;
  const code = (result.error as { code?: unknown }).code;
  return (
    typeof code === "string" &&
    ["key_not_found", "not_found", "kv_not_found"].includes(code.toLowerCase())
  );
}

function describeKvError(result: { error?: unknown }): string {
  const error = result.error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    if (typeof code === "string" && typeof message === "string") return `${code}: ${message}`;
    if (typeof message === "string") return message;
  }
  return "TinyCloud KV operation failed";
}

function kvErrorCode(result: { error?: unknown }): string | undefined {
  if (typeof result.error !== "object" || result.error === null) return undefined;
  const code = (result.error as { code?: unknown }).code;
  return typeof code === "string" ? code.toLowerCase() : undefined;
}

function delegationStoreError(message: string, code?: string): Error {
  return code ? Object.assign(new Error(message), { code }) : new Error(message);
}

function legacyDelegationRevision(record: {
  serialized?: unknown;
  grantedAt?: unknown;
  expiresAt?: unknown;
  actions?: unknown;
  path?: unknown;
  policyHash?: unknown;
  resources?: unknown;
}): string {
  const canonical = JSON.stringify({
    serialized: record.serialized,
    grantedAt: record.grantedAt,
    expiresAt: record.expiresAt,
    actions: record.actions,
    path: record.path,
    policyHash: record.policyHash,
    resources: record.resources,
  });
  return `legacy:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function extractKvData(result: unknown): unknown {
  if (typeof result !== "object" || result === null || !("data" in result)) {
    return undefined;
  }

  const data = (result as { data?: unknown }).data;
  if (data === null) return null;
  if (typeof data === "object" && data !== null && "data" in data) {
    const nested = (data as { data?: unknown }).data;
    if (nested === undefined) return undefined;
    return nested;
  }
  return data;
}

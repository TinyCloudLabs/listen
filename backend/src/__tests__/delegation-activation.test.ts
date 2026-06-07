import { describe, expect, it, mock } from "bun:test";
import { activatePortableDelegation } from "../delegation-activation.js";

const TEST_DID = "did:pkh:eip155:1:0xTEST";
const NETWORK_ID = `urn:tinycloud:encryption:${TEST_DID}:default`;

function makeDelegation(
  resource: { service: string; space?: string; path: string; actions: string[] },
  cid: string,
) {
  return {
    cid,
    expiry: new Date(Date.now() + 86_400_000),
    spaceId: `${TEST_DID}:applications`,
    path: resource.path,
    actions: [...resource.actions],
    delegationHeader: { Authorization: `Bearer ${cid}` },
    ownerAddress: "0xTEST",
    chainId: 1,
    resources: [resource],
  } as any;
}

describe("delegation activation secrets", () => {
  it("decrypts secret payloads through the TinyCloud encryption service", async () => {
    const envelope = {
      v: 1,
      networkId: NETWORK_ID,
      alg: "x25519-aes256gcm/v1",
      keyVersion: 1,
      encryptedSymmetricKey: "wrapped-symmetric-key",
      encryptedSymmetricKeyHash: "hash",
      ciphertext: "ciphertext",
      metadata: {},
    };
    const kvGet = mock(async (key: string, options?: { prefix?: string; raw?: boolean }) => {
      expect(key).toBe("vault/secrets/FIREFLIES_API_KEY");
      expect(options).toEqual({ raw: true, prefix: "" });
      return { ok: true, data: { data: JSON.stringify(envelope) } };
    });
    const decryptEnvelope = mock(async (input: unknown, proof: unknown) => {
      expect(input).toEqual(envelope);
      expect(proof).toEqual({ proofs: ["cid-secret"] });
      return {
        ok: true,
        data: new TextEncoder().encode(
          JSON.stringify({
            value: "secret-value",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          }),
        ),
      };
    });
    const useDelegation = mock(async (delegation: any) => ({
      kv: { get: kvGet, put: async () => ({ ok: true }), list: async () => ({ ok: true }) },
      sql: { query: async () => ({ ok: true }), execute: async () => ({ ok: true }) },
      restorable: { delegationCid: delegation.cid },
      delegation,
    }));

    const node = {
      useDelegation,
      encryption: { decryptEnvelope },
    } as any;

    const access = await activatePortableDelegation(node, [
      makeDelegation(
        {
          service: "tinycloud.kv",
          space: "secrets",
          path: "vault/secrets/FIREFLIES_API_KEY",
          actions: ["tinycloud.kv/get"],
        },
        "cid-secret",
      ),
      makeDelegation(
        {
          service: "tinycloud.sql",
          space: "applications",
          path: "conversations",
          actions: ["tinycloud.sql/read"],
        },
        "cid-sql",
      ),
    ]);

    const result = await access.secrets.get("FIREFLIES_API_KEY");

    expect(result).toEqual({ ok: true, data: "secret-value" });
    expect(kvGet).toHaveBeenCalledTimes(1);
    expect(decryptEnvelope).toHaveBeenCalledTimes(1);
  });

  it("passes decrypt denials through to secret reads", async () => {
    const envelope = {
      v: 1,
      networkId: NETWORK_ID,
      alg: "x25519-aes256gcm/v1",
      keyVersion: 1,
      encryptedSymmetricKey: "wrapped-symmetric-key",
      encryptedSymmetricKeyHash: "hash",
      ciphertext: "ciphertext",
      metadata: {},
    };
    const kvGet = mock(async () => ({
      ok: true,
      data: { data: JSON.stringify(envelope) },
    }));
    const decryptEnvelope = mock(async () => ({
      ok: false,
      error: { code: "DECRYPT_DENIED", message: "decrypt denied" },
    }));
    const useDelegation = mock(async (delegation: any) => ({
      kv: { get: kvGet, put: async () => ({ ok: true }), list: async () => ({ ok: true }) },
      sql: { query: async () => ({ ok: true }), execute: async () => ({ ok: true }) },
      restorable: { delegationCid: delegation.cid },
      delegation,
    }));

    const node = {
      useDelegation,
      encryption: { decryptEnvelope },
    } as any;

    const access = await activatePortableDelegation(node, [
      makeDelegation(
        {
          service: "tinycloud.kv",
          space: "secrets",
          path: "vault/secrets/FIREFLIES_API_KEY",
          actions: ["tinycloud.kv/get"],
        },
        "cid-secret",
      ),
      makeDelegation(
        {
          service: "tinycloud.sql",
          space: "applications",
          path: "conversations",
          actions: ["tinycloud.sql/read"],
        },
        "cid-sql",
      ),
    ]);

    const result = await access.secrets.get("FIREFLIES_API_KEY");

    expect(result).toEqual({
      ok: false,
      error: { code: "DECRYPT_DENIED", message: "decrypt denied" },
    });
    expect(decryptEnvelope).toHaveBeenCalledTimes(1);
  });
});

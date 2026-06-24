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
  it("uses non-secret app KV for general KV operations when secret resources come first", async () => {
    const secretPut = mock(async () => ({ ok: true }));
    const appPut = mock(async () => ({ ok: true }));
    const useDelegation = mock(async (delegation: any) => ({
      kv: {
        get: async () => ({ ok: true, data: { data: null } }),
        put: delegation.path === "/" ? appPut : secretPut,
        list: async () => ({ ok: true }),
      },
      restorable: { delegationCid: delegation.cid },
      delegation,
    }));

    const node = { useDelegation } as any;

    const access = await activatePortableDelegation(node, [
      makeDelegation(
        {
          service: "tinycloud.kv",
          space: "secrets",
          path: "vault/secrets/DEEPGRAM_API_KEY",
          actions: ["tinycloud.kv/get"],
        },
        "cid-secret",
      ),
      makeDelegation(
        {
          service: "tinycloud.kv",
          space: "applications",
          path: "/",
          actions: ["tinycloud.kv/get", "tinycloud.kv/put"],
        },
        "cid-app-kv",
      ),
    ]);

    await access.kv.put("config/google-tokens", "{}");

    expect(appPut).toHaveBeenCalledTimes(1);
    expect(secretPut).not.toHaveBeenCalled();
  });

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

  it("encrypts delegated secret writes and deletes through the secret KV resource", async () => {
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
    const kvPut = mock(async (key: string, value: string, options?: { prefix?: string }) => {
      expect(key).toBe("vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS");
      expect(JSON.parse(value)).toEqual(envelope);
      expect(options).toEqual({ prefix: "" });
      return { ok: true };
    });
    const kvDelete = mock(async (key: string, options?: { prefix?: string }) => {
      expect(key).toBe("vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS");
      expect(options).toEqual({ prefix: "" });
      return { ok: true };
    });
    const encryptToNetwork = mock(
      async (networkId: string, plaintext: Uint8Array, options: { aad: Uint8Array }) => {
        expect(networkId).toBe(NETWORK_ID);
        expect(JSON.parse(new TextDecoder().decode(plaintext))).toMatchObject({
          value: '{"access_token":"ya29.test"}',
        });
        expect(new TextDecoder().decode(options.aad)).toBe(
          `tinycloud.vault:${TEST_DID}:applications:secrets/scoped/listen/GOOGLE_MEET_TOKENS`,
        );
        return { ok: true, data: envelope };
      },
    );
    const useDelegation = mock(async (delegation: any) => ({
      kv: {
        get: async () => ({ ok: true, data: { data: null } }),
        put: kvPut,
        delete: kvDelete,
        list: async () => ({ ok: true }),
      },
      sql: { query: async () => ({ ok: true }), execute: async () => ({ ok: true }) },
      restorable: { delegationCid: delegation.cid },
      delegation,
      spaceId: delegation.spaceId,
    }));

    const node = {
      useDelegation,
      encryption: {
        decryptEnvelope: async () => ({ ok: true, data: new Uint8Array() }),
        encryptToNetwork,
      },
    } as any;

    const access = await activatePortableDelegation(node, [
      makeDelegation(
        {
          service: "tinycloud.kv",
          space: "secrets",
          path: "vault/secrets/scoped/listen/GOOGLE_MEET_TOKENS",
          actions: ["tinycloud.kv/get", "tinycloud.kv/put", "tinycloud.kv/del"],
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

    expect(
      await access.secrets.put("GOOGLE_MEET_TOKENS", '{"access_token":"ya29.test"}', {
        scope: "listen",
      }),
    ).toEqual({
      ok: true,
      data: undefined,
    });
    expect(await access.secrets.delete("GOOGLE_MEET_TOKENS", { scope: "listen" })).toEqual({
      ok: true,
      data: undefined,
    });
    expect(encryptToNetwork).toHaveBeenCalledTimes(1);
    expect(kvPut).toHaveBeenCalledTimes(1);
    expect(kvDelete).toHaveBeenCalledTimes(1);
  });

  it("includes encryption delegation proofs when decrypting delegated secrets", async () => {
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
    const decryptEnvelope = mock(async (_input: unknown, proof: unknown) => {
      expect(proof).toEqual({ proofs: ["cid-secret", "cid-encryption"] });
      return {
        ok: true,
        data: new TextEncoder().encode(JSON.stringify({ value: "session-secret" })),
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
          path: "vault/secrets/SOUNDCORE_SESSION",
          actions: ["tinycloud.kv/get"],
        },
        "cid-secret",
      ),
      makeDelegation(
        {
          service: "tinycloud.encryption",
          space: "encryption",
          path: NETWORK_ID,
          actions: ["tinycloud.encryption/decrypt"],
        },
        "cid-encryption",
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

    const result = await access.secrets.get("SOUNDCORE_SESSION");

    expect(result).toEqual({ ok: true, data: "session-secret" });
    expect(decryptEnvelope).toHaveBeenCalledTimes(1);
  });
});

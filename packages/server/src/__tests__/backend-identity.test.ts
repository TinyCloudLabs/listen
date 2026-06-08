import { describe, test, expect, mock, beforeEach } from "bun:test";

const constructedConfigs: any[] = [];
const signInMock = mock(() => Promise.resolve());

class MockTinyCloudNode {
  did = "did:pkh:eip155:1:0xBackend";
  signIn = signInMock;

  constructor(config: any) {
    constructedConfigs.push(config);
  }
}

mock.module("@tinycloud/node-sdk", () => ({
  TinyCloudNode: MockTinyCloudNode,
}));

const { createBackendIdentity } = await import("../identity.js");

describe("createBackendIdentity", () => {
  beforeEach(() => {
    constructedConfigs.length = 0;
    signInMock.mockClear();
  });

  test("signs in with a narrow backend delegation-store manifest", async () => {
    const identity = await createBackendIdentity({
      privateKey: "0xbackend",
      host: "http://localhost:8787",
      prefix: "listen-be",
    });

    expect(identity.did).toBe("did:pkh:eip155:1:0xBackend");
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(constructedConfigs).toHaveLength(1);
    expect(constructedConfigs[0]).toMatchObject({
      privateKey: "0xbackend",
      host: "http://localhost:8787",
      prefix: "listen-be",
      autoCreateSpace: true,
      enablePublicSpace: false,
      includeAccountRegistryPermissions: false,
    });
    expect(constructedConfigs[0].manifest).toEqual({
      manifest_version: 1,
      app_id: "xyz.tinycloud.listen.backend",
      name: "Listen Backend",
      defaults: false,
      permissions: [
        {
          service: "tinycloud.kv",
          space: "listen-be",
          path: "delegations/",
          actions: ["get", "put", "del", "list", "metadata"],
          skipPrefix: true,
        },
      ],
    });
  });
});

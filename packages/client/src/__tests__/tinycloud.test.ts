import { describe, expect, mock, test } from "bun:test";

let lastTinyCloudConfig: any = null;

mock.module("@tinycloud/web-sdk", () => ({
  BrowserSessionStorage: class BrowserSessionStorage {},
  TinyCloudWeb: class TinyCloudWeb {
    provider: unknown;

    constructor(config: any) {
      lastTinyCloudConfig = config;
    }
  },
}));

const { createTinyCloudWeb } = await import("../tinycloud.js");

describe("createTinyCloudWeb", () => {
  test("stores composed request manifests for permission escalation", () => {
    const manifests = [
      {
        manifest_version: 1,
        app_id: "xyz.tinycloud.listen",
        name: "Listen",
        permissions: [],
      },
    ];
    const capabilityRequest = {
      manifests,
      resources: [],
      delegationTargets: [],
    };
    const provider = { request: async () => null } as any;

    const tcw = createTinyCloudWeb(provider, { capabilityRequest });

    expect(lastTinyCloudConfig.capabilityRequest).toBe(capabilityRequest);
    expect(lastTinyCloudConfig.manifest).toBe(manifests);
    expect((tcw as any).provider).toBe(provider);
  });

  test("preserves an explicit manifest over composed request manifests", () => {
    const explicitManifest = {
      manifest_version: 1,
      app_id: "xyz.tinycloud.explicit",
      name: "Explicit",
      permissions: [],
    };
    const capabilityRequest = {
      manifests: [
        {
          manifest_version: 1,
          app_id: "xyz.tinycloud.composed",
          name: "Composed",
          permissions: [],
        },
      ],
      resources: [],
      delegationTargets: [],
    };

    createTinyCloudWeb({ request: async () => null } as any, {
      manifest: explicitManifest,
      capabilityRequest,
    });

    expect(lastTinyCloudConfig.manifest).toBe(explicitManifest);
  });

  test("passes a signing strategy through to TinyCloudWeb", () => {
    const signStrategy = {
      type: "callback",
      openKeyAutoSign: true,
      handler: async () => ({ approved: true, signature: "0x1234" }),
    };

    createTinyCloudWeb({ request: async () => null } as any, { signStrategy });

    expect(lastTinyCloudConfig.signStrategy).toBe(signStrategy);
  });
});

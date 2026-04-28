import { describe, expect, test } from "bun:test";
import { resolveTinyCloudHosts } from "../location.js";

describe("resolveTinyCloudHosts", () => {
  test("uses explicit hosts through the SDK location resolver", async () => {
    const resolved = await resolveTinyCloudHosts(
      "did:pkh:eip155:1:0x0000000000000000000000000000000000000000",
      {
        explicitHosts: ["https://local.node.test"],
        fallbackHosts: ["https://node.tinycloud.xyz"],
      },
    );

    expect(resolved.location.source).toBe("explicit");
    expect(resolved.hosts).toEqual(["https://local.node.test"]);
  });
});

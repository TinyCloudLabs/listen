import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { composeListenOwnerShareDraft } from "../frontend/src/lib/listenOwnerShares";
import {
  canonicalJson,
  dryRunInput,
  parseState,
  runCli,
  runOwnerPublish,
  runOwnerRevoke,
} from "./m1-owner-demo";

describe("m1 owner split-phase demo driver", () => {
  it("emits a deterministic publish artifact matching library composition", async () => {
    const input = dryRunInput();
    const first = await runOwnerPublish({ input, mode: "dry-run" });
    const second = await runOwnerPublish({ input, mode: "dry-run" });
    const libraryDraft = {
      ...composeListenOwnerShareDraft(input.conversations, {
        conversationIds: input.selectedTranscriptIds,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      }),
      shareId: input.shareId!,
    };

    expect(first.artifact).toMatchObject({
      schema: "xyz.tinycloud.listen/m1-owner-publish-artifact/v1",
      mode: "dry-run",
      input: {
        selectedTranscriptIds: ["conversation-a", "conversation-b"],
        ownerDid: "did:pkh:eip155:1:0x0000000000000000000000000000000000000abc",
        createdAt: "2026-05-14T14:00:00Z",
        expiresAt: "2026-06-13T14:00:00Z",
        nodeEndpoint: "https://node.tinycloud.xyz",
        ownerNodeEndpoint: "https://node.tinycloud.xyz",
      },
      publish: {
        shareId: "share-m1-owner-dry-run",
        bootstrapPath: "xyz.tinycloud.listen/owner-shares/share-m1-owner-dry-run/bootstrap.json",
        bootstrap: {
          ownerNode: {
            endpoint: "https://node.tinycloud.xyz",
            spaceId:
              "tinycloud:pkh:eip155:1:0x0000000000000000000000000000000000000abc:applications",
          },
        },
      },
    });
    expect(first.artifact.composition).toEqual({
      capabilities: libraryDraft.capabilities,
      disclosure: libraryDraft.disclosure,
    });
    expect(first.artifact.publish.writeSet.map((write) => write.path).sort()).toEqual(
      [
        first.artifact.publish.policyPath,
        first.artifact.publish.statusPath,
        first.artifact.publish.bootstrapPath,
        first.artifact.publish.engineRecordPath,
      ].sort(),
    );
    expect(first.artifact.publish.activeStatusId).toMatch(/^polst_/);
    expect(canonicalJson(first.artifact)).toBe(canonicalJson(second.artifact));
    expect(canonicalJson(first)).not.toMatch(/privateKey|private_key|secretKey|secret_key/i);
  });

  it("requires --owner-node-endpoint in live publish mode", async () => {
    await expect(
      runOwnerPublish({
        input: dryRunInput(),
        mode: "live",
        nodeEndpoint: "http://127.0.0.1:8787",
        privateKey: `0x${"01".repeat(32)}`,
      }),
    ).rejects.toThrow("live mode requires --owner-node-endpoint");
  });

  it("composes the owner routing endpoint separately from the operational node", async () => {
    const published = await runOwnerPublish({
      input: dryRunInput(),
      mode: "dry-run",
      nodeEndpoint: "http://127.0.0.1:8787",
      ownerNodeEndpoint: "https://owner.example.com",
    });

    expect(published.artifact.input).toMatchObject({
      nodeEndpoint: "http://127.0.0.1:8787",
      ownerNodeEndpoint: "https://owner.example.com",
    });
    expect(published.artifact.publish.bootstrap).toMatchObject({
      ownerNode: { endpoint: "https://owner.example.com" },
    });
    expect(published.state.session).toMatchObject({
      nodeEndpoint: "http://127.0.0.1:8787",
      ownerNodeEndpoint: "https://owner.example.com",
    });
  });

  it("round-trips public state between separate publish and revoke phases", async () => {
    const input = dryRunInput();
    const published = await runOwnerPublish({ input, mode: "dry-run" });
    const state = parseState(JSON.parse(canonicalJson(published.state)));
    const revoked = await runOwnerRevoke({ input, mode: "dry-run", state });

    expect(state.published.status).toBe("active");
    expect(revoked).toMatchObject({
      schema: "xyz.tinycloud.listen/m1-owner-revoke-artifact/v1",
      mode: "dry-run",
      revoke: {
        shareId: state.published.shareId,
        policyId: state.published.policyId,
        disposition: "revoked",
        receipt: { status: "revoked", updatedAt: "2026-05-14T14:05:00Z" },
      },
    });
    expect(revoked.revoke.revokedStatusId).toMatch(/^polst_/);
    expect(revoked.revoke.writeSet).toHaveLength(1);
    expect(revoked.revoke.writeSet[0]?.path).toBe(state.published.statusPath);
    expect(canonicalJson(revoked)).toBe(
      canonicalJson(await runOwnerRevoke({ input, mode: "dry-run", state })),
    );
  });

  it("round-trips a --state file across separate CLI invocations", async () => {
    const directory = mkdtempSync(join(tmpdir(), "listen-m1-owner-"));
    const statePath = join(directory, "owner-state.json");
    const publishPath = join(directory, "publish.json");
    const revokePath = join(directory, "revoke.json");
    try {
      await runCli(["publish", "--dry-run", "--state", statePath, "--out", publishPath]);
      const state = parseState(JSON.parse(readFileSync(statePath, "utf8")));
      await runCli(["revoke", "--dry-run", "--state", statePath, "--out", revokePath]);

      expect(JSON.parse(readFileSync(publishPath, "utf8"))).toMatchObject({
        schema: "xyz.tinycloud.listen/m1-owner-publish-artifact/v1",
      });
      expect(JSON.parse(readFileSync(revokePath, "utf8"))).toMatchObject({
        schema: "xyz.tinycloud.listen/m1-owner-revoke-artifact/v1",
        revoke: { shareId: state.published.shareId, disposition: "revoked" },
      });
      expect(readFileSync(statePath, "utf8")).not.toMatch(
        /privateKey|private_key|secretKey|secret_key/i,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

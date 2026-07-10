import { describe, expect, it } from "vitest";

import { composeListenOwnerShareDraft } from "../frontend/src/lib/listenOwnerShares";
import { canonicalJson, dryRunInput, runOwnerDemo } from "./m1-owner-demo";

describe("m1 owner demo driver", () => {
  it("emits a deterministic canonical artifact matching library composition", async () => {
    const input = dryRunInput();
    const artifact = await runOwnerDemo({ input, mode: "dry-run" });
    const libraryDraft = {
      ...composeListenOwnerShareDraft(input.conversations, {
        conversationIds: input.selectedTranscriptIds,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      }),
      shareId: input.shareId!,
    };

    expect(artifact).toMatchObject({
      schema: "xyz.tinycloud.listen/m1-owner-demo-artifact/v1",
      mode: "dry-run",
      input: {
        selectedTranscriptIds: ["conversation-a", "conversation-b"],
        ownerDid: "did:pkh:eip155:1:0x0000000000000000000000000000000000000abc",
        createdAt: "2026-05-14T14:00:00Z",
        expiresAt: "2026-06-13T14:00:00Z",
      },
      publish: {
        shareId: "share-m1-owner-dry-run",
        bootstrapPath: "xyz.tinycloud.listen/owner-shares/share-m1-owner-dry-run/bootstrap.json",
      },
      revoke: {
        disposition: "revoked",
        receipt: {
          status: "revoked",
          updatedAt: "2026-05-14T14:05:00Z",
        },
      },
    });
    expect(artifact.composition).toEqual({
      capabilities: libraryDraft.capabilities,
      disclosure: libraryDraft.disclosure,
    });
    expect(artifact.publish.writeSet.map((write) => write.path).sort()).toEqual(
      [
        artifact.publish.policyPath,
        artifact.publish.statusPath,
        artifact.publish.bootstrapPath,
        artifact.publish.engineRecordPath,
      ].sort(),
    );
    expect(artifact.publish.activeStatusId).toMatch(/^polst_/);
    expect(artifact.revoke.revokedStatusId).toMatch(/^polst_/);
    expect(canonicalJson(artifact)).toBe(
      canonicalJson(await runOwnerDemo({ input, mode: "dry-run" })),
    );
    expect(canonicalJson(artifact)).not.toMatch(/private|secret|audio_data_kv_key/i);
  });
});

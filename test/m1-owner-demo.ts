import { readFileSync, renameSync, writeFileSync } from "node:fs";

import { TinyCloudNode, type OwnerDelegationReceipt } from "@tinycloud/node-sdk-m1";
import { Wallet } from "ethers";

import {
  composeListenOwnerShareDraft,
  publishListenOwnerShare,
  revokeListenOwnerShare,
  type ListenOwnerShareDraft,
  type PublishedListenOwnerShare,
} from "../frontend/src/lib/listenOwnerShares";
import type { ShareableConversationDetail } from "../frontend/src/lib/listenShareLinks";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

interface OwnerDemoInput {
  selectedTranscriptIds: string[];
  emailDomain: string;
  conversations: ShareableConversationDetail[];
  grantIssuerDid?: string;
  ownerAddress?: string;
  chainId?: number;
  createdAt?: string;
  expiresAt?: string;
  shareId?: string;
  revokeAt?: string;
}

interface CapturedWrite {
  path: string;
  value: Record<string, unknown>;
}

export interface OwnerDemoState {
  schema: "xyz.tinycloud.listen/m1-owner-demo-state/v1";
  session: {
    ownerDid: string;
    ownerAddress: string;
    chainId: number;
    spaceId: string;
    nodeEndpoint: string;
    ownerNodeEndpoint: string;
  };
  published: PublishedListenOwnerShare;
  parentDelegation?: {
    delegateDid: string;
    spaceId: string;
    path: string;
    actions: string[];
    expiresAt: string;
    signedDagCborBase64url: string;
    delegationCid: string;
    rawReceipt: {
      commitEventCid?: string;
      activated: string[];
      skipped: string[];
    };
  };
}

export interface OwnerPublishArtifact {
  schema: "xyz.tinycloud.listen/m1-owner-publish-artifact/v1";
  mode: "dry-run" | "live";
  input: {
    selectedTranscriptIds: string[];
    emailDomain: string;
    ownerDid: string;
    createdAt: string;
    expiresAt: string;
    nodeEndpoint: string;
    ownerNodeEndpoint: string;
  };
  composition: {
    capabilities: ListenOwnerShareDraft["capabilities"];
    disclosure: ListenOwnerShareDraft["disclosure"];
  };
  publish: {
    shareId: string;
    policyId: string;
    activeStatusId: string;
    engineRecordId: string;
    policyPath: string;
    statusPath: string;
    bootstrapPath: string;
    engineRecordPath: string;
    bootstrap: unknown;
    writeSet: Array<{ path: string; schema: string | null; id: string | null }>;
  };
  parentDelegation?: OwnerDemoState["parentDelegation"];
}

export interface OwnerRevokeArtifact {
  schema: "xyz.tinycloud.listen/m1-owner-revoke-artifact/v1";
  mode: "dry-run" | "live";
  revoke: {
    shareId: string;
    policyId: string;
    revokedStatusId: string;
    statusPath: string;
    disposition: "revoked";
    writeSet: Array<{ path: string; schema: string | null; id: string | null }>;
    receipt: { status: "revoked"; updatedAt: string };
  };
}

interface PhaseOptions {
  input: OwnerDemoInput;
  mode: "dry-run" | "live";
  nodeEndpoint?: string;
  ownerNodeEndpoint?: string;
  privateKey?: string;
  statePath?: string;
}

const DRY_RUN_CREATED_AT = "2026-05-14T14:00:00Z";
const DRY_RUN_EXPIRES_AT = "2026-06-13T14:00:00Z";
const DRY_RUN_REVOKE_AT = "2026-05-14T14:05:00Z";
const DRY_RUN_OWNER_ADDRESS = "0x0000000000000000000000000000000000000abc";
const DRY_RUN_OWNER_SPACE =
  "tinycloud:pkh:eip155:1:0x0000000000000000000000000000000000000abc:applications";
const DRY_RUN_NODE_ENDPOINT = "https://node.tinycloud.xyz";
const DRY_RUN_SIGNATURE = `0x${"11".repeat(64)}1b`;
const PARENT_PATH = "xyz.tinycloud.listen/conversations";
const PARENT_ACTIONS = ["tinycloud.sql/read", "tinycloud.kv/get"] as const;

export function dryRunInput(): OwnerDemoInput {
  return {
    selectedTranscriptIds: ["conversation-a", "conversation-b"],
    emailDomain: "issuer.credentials.org",
    grantIssuerDid: "did:key:z6MkM1GrantIssuer",
    ownerAddress: DRY_RUN_OWNER_ADDRESS,
    chainId: 1,
    createdAt: DRY_RUN_CREATED_AT,
    expiresAt: DRY_RUN_EXPIRES_AT,
    shareId: "share-m1-owner-dry-run",
    revokeAt: DRY_RUN_REVOKE_AT,
    conversations: [
      detail("conversation-a", "Planning"),
      detail("conversation-b", "Retro", {
        audio_data_kv_key: "audio/conversation-b/recording",
        futureTranscripts: true,
      }),
    ],
  };
}

function detail(
  id: string,
  title: string,
  metadata: Record<string, unknown> = {},
): ShareableConversationDetail {
  return {
    conversation: {
      id,
      title,
      source: "manual",
      source_url: null,
      started_at: DRY_RUN_CREATED_AT,
      ended_at: "2026-05-14T14:20:00Z",
      duration_secs: 1200,
      summary: "M1 owner demo fixture",
      metadata,
      transcript_json: [{ speaker: "Ada", text: "Hello" }],
      created_at: DRY_RUN_CREATED_AT,
      updated_at: DRY_RUN_CREATED_AT,
    },
    participants: [{ id: "p1", name: "Ada", email: "ada@example.com", speaker_label: "Speaker 1" }],
    transcript: [{ speakerName: "Ada", text: "Hello", startTime: 0, endTime: 1 }],
  };
}

function ownerDid(address: string, chainId: number): string {
  return `did:pkh:eip155:${chainId}:${address}`;
}

function withFixedDate<Result>(
  iso: string | undefined,
  task: () => Promise<Result>,
): Promise<Result> {
  if (!iso) return task();
  const RealDate = Date;
  const fixedTime = new RealDate(iso).getTime();
  class FixedDate extends RealDate {
    constructor(value?: string | number | Date) {
      super(value ?? fixedTime);
    }
    static now() {
      return fixedTime;
    }
  }
  globalThis.Date = FixedDate as DateConstructor;
  return task().finally(() => {
    globalThis.Date = RealDate;
  });
}

function objectId(value: Record<string, unknown>): string | null {
  for (const key of ["policyId", "statusId", "engineRecordId"]) {
    const id = value[key];
    if (typeof id === "string") return id;
  }
  return null;
}

function writeSetSummary(writes: readonly CapturedWrite[]) {
  return writes.map((write) => ({
    path: write.path,
    schema: typeof write.value.schema === "string" ? write.value.schema : null,
    id: objectId(write.value),
  }));
}

function findWrite(writes: readonly CapturedWrite[], suffix: string): CapturedWrite {
  const write = writes.find((entry) => entry.path.endsWith(suffix));
  if (!write) throw new Error(`missing write ending with ${suffix}`);
  return write;
}

function draftFrom(input: OwnerDemoInput): ListenOwnerShareDraft {
  const draft = composeListenOwnerShareDraft(input.conversations, {
    conversationIds: input.selectedTranscriptIds,
    emailDomain: input.emailDomain,
    createdAt: input.createdAt ?? DRY_RUN_CREATED_AT,
    expiresAt: input.expiresAt ?? DRY_RUN_EXPIRES_AT,
  });
  return { ...draft, ...(input.shareId ? { shareId: input.shareId } : {}) };
}

function captureAdapter(
  address: string,
  chainId: number,
  writes: CapturedWrite[],
  signer: (digest: Uint8Array) => Promise<string>,
) {
  return {
    session: () => ({ address, chainId }),
    provider: { getSigner: () => ({ signMessage: signer }) },
    kv: {
      put: async (path: string, serialized: string) => {
        writes.push({ path, value: JSON.parse(serialized) as Record<string, unknown> });
        return { ok: true };
      },
    },
  };
}

async function liveContext(options: PhaseOptions) {
  if (!options.privateKey) throw new Error("live mode requires a private key environment variable");
  if (!options.nodeEndpoint) throw new Error("live mode requires --node-endpoint");
  const wallet = new Wallet(options.privateKey);
  const node = new TinyCloudNode({
    privateKey: options.privateKey.replace(/^0x/, ""),
    host: options.nodeEndpoint,
    prefix: "listen",
    autoCreateSpace: true,
  });
  await node.signIn();
  const session = node.session;
  if (!session || !node.spaceId || !node.address) throw new Error("owner session bootstrap failed");
  const writes: CapturedWrite[] = [];
  return {
    node,
    wallet,
    session,
    writes,
    adapter: {
      session: () => ({ address: session.address, chainId: session.chainId }),
      provider: {
        getSigner: () => ({ signMessage: (digest: Uint8Array) => wallet.signMessage(digest) }),
      },
      kv: {
        put: async (path: string, serialized: string) => {
          writes.push({ path, value: JSON.parse(serialized) as Record<string, unknown> });
          return node.kv.put(path, serialized);
        },
      },
    },
  };
}

function parentState(
  receipt: OwnerDelegationReceipt,
): NonNullable<OwnerDemoState["parentDelegation"]> {
  const target = receipt.delegation.spaceId;
  if (
    !receipt.nodeReceipt.activated.includes(target) ||
    receipt.nodeReceipt.skipped.includes(target)
  ) {
    throw new Error("owner delegation import was not confirmed fail-closed");
  }
  if (receipt.delegation.cid !== receipt.delegationCid) {
    throw new Error("locally derived delegation CID does not match delegation identity");
  }
  return {
    delegateDid: receipt.delegation.delegateDID,
    spaceId: target,
    path: receipt.delegation.path,
    actions: [...receipt.delegation.actions],
    expiresAt: receipt.delegation.expiry.toISOString(),
    signedDagCborBase64url: Buffer.from(receipt.signedDagCbor).toString("base64url"),
    delegationCid: receipt.delegationCid,
    rawReceipt: {
      ...(receipt.nodeReceipt.commitEventCid
        ? { commitEventCid: receipt.nodeReceipt.commitEventCid }
        : {}),
      activated: [...receipt.nodeReceipt.activated],
      skipped: [...receipt.nodeReceipt.skipped],
    },
  };
}

export async function runOwnerPublish(options: PhaseOptions): Promise<{
  artifact: OwnerPublishArtifact;
  state: OwnerDemoState;
}> {
  const draft = draftFrom(options.input);
  const grantIssuerDid = options.input.grantIssuerDid;
  if (!grantIssuerDid?.startsWith("did:key:"))
    throw new Error("publish requires grantIssuerDid did:key");

  let address = options.input.ownerAddress ?? DRY_RUN_OWNER_ADDRESS;
  let chainId = options.input.chainId ?? 1;
  let spaceId = DRY_RUN_OWNER_SPACE;
  let nodeEndpoint = options.nodeEndpoint ?? DRY_RUN_NODE_ENDPOINT;
  let ownerNodeEndpoint = options.ownerNodeEndpoint ?? DRY_RUN_NODE_ENDPOINT;
  let writes: CapturedWrite[] = [];
  let adapter = captureAdapter(address, chainId, writes, async () => DRY_RUN_SIGNATURE);
  let parentDelegation: OwnerDemoState["parentDelegation"];

  if (options.mode === "live") {
    if (!options.ownerNodeEndpoint) throw new Error("live mode requires --owner-node-endpoint");
    const live = await liveContext(options);
    address = live.session.address;
    chainId = live.session.chainId;
    spaceId = live.node.spaceId!;
    nodeEndpoint = options.nodeEndpoint!;
    ownerNodeEndpoint = options.ownerNodeEndpoint;
    writes = live.writes;
    adapter = live.adapter;
    const receipt = await live.node.createOwnerDelegation({
      delegateDid: grantIssuerDid,
      spaceId,
      path: PARENT_PATH,
      actions: PARENT_ACTIONS,
      expiresAt: new Date(draft.expiresAt),
    });
    parentDelegation = parentState(receipt);
    if (parentDelegation.delegateDid !== grantIssuerDid) {
      throw new Error("owner delegation delegatee does not match grant issuer");
    }
  }

  const published = await publishListenOwnerShare(adapter as never, draft, {
    grantIssuerDid,
    ownerNodeEndpoint,
    ownerSpaceId: spaceId,
  });
  const activeStatus = findWrite(writes, "/status.json").value;
  const artifact: OwnerPublishArtifact = {
    schema: "xyz.tinycloud.listen/m1-owner-publish-artifact/v1",
    mode: options.mode,
    input: {
      selectedTranscriptIds: [...options.input.selectedTranscriptIds],
      emailDomain: draft.credentialRule.emailDomains[0],
      ownerDid: ownerDid(address, chainId),
      createdAt: draft.createdAt,
      expiresAt: draft.expiresAt,
      nodeEndpoint,
      ownerNodeEndpoint,
    },
    composition: { capabilities: draft.capabilities, disclosure: draft.disclosure },
    publish: {
      shareId: published.shareId,
      policyId: published.policyId,
      activeStatusId: String(activeStatus.statusId),
      engineRecordId: published.bootstrap.policyEngine.signedRecord.engineRecordId,
      policyPath: published.policyPath,
      statusPath: published.statusPath,
      bootstrapPath: published.bootstrapPath,
      engineRecordPath: published.engineRecordPath,
      bootstrap: published.bootstrap,
      writeSet: writeSetSummary(writes),
    },
    ...(parentDelegation ? { parentDelegation } : {}),
  };
  const state: OwnerDemoState = {
    schema: "xyz.tinycloud.listen/m1-owner-demo-state/v1",
    session: {
      ownerDid: ownerDid(address, chainId),
      ownerAddress: address,
      chainId,
      spaceId,
      nodeEndpoint,
      ownerNodeEndpoint,
    },
    published,
    ...(parentDelegation ? { parentDelegation } : {}),
  };
  if (options.statePath) writeState(options.statePath, state);
  return { artifact, state };
}

export async function runOwnerRevoke(
  options: PhaseOptions & { state: OwnerDemoState },
): Promise<OwnerRevokeArtifact> {
  let writes: CapturedWrite[] = [];
  let adapter = captureAdapter(
    options.state.session.ownerAddress,
    options.state.session.chainId,
    writes,
    async () => DRY_RUN_SIGNATURE,
  );
  if (options.mode === "live") {
    const live = await liveContext({
      ...options,
      nodeEndpoint: options.state.session.nodeEndpoint,
    });
    if (
      ownerDid(live.session.address, live.session.chainId) !== options.state.session.ownerDid ||
      live.node.spaceId !== options.state.session.spaceId
    ) {
      throw new Error("revoke owner session does not match published state");
    }
    writes = live.writes;
    adapter = live.adapter;
  }
  const revoked = await withFixedDate(options.input.revokeAt, () =>
    revokeListenOwnerShare(adapter as never, options.state.published),
  );
  const revokedStatus = findWrite(writes, "/status.json").value;
  return {
    schema: "xyz.tinycloud.listen/m1-owner-revoke-artifact/v1",
    mode: options.mode,
    revoke: {
      shareId: revoked.shareId,
      policyId: revoked.policyId,
      revokedStatusId: String(revokedStatus.statusId),
      statusPath: revoked.statusPath,
      disposition: "revoked",
      writeSet: writeSetSummary(writes),
      receipt: { status: revoked.status, updatedAt: revoked.updatedAt },
    },
  };
}

export function parseState(value: unknown): OwnerDemoState {
  if (!value || typeof value !== "object") throw new Error("owner state must be an object");
  const state = value as OwnerDemoState;
  if (
    state.schema !== "xyz.tinycloud.listen/m1-owner-demo-state/v1" ||
    !state.session?.ownerDid ||
    !state.session?.spaceId ||
    !state.published?.shareId
  ) {
    throw new Error("owner state is malformed");
  }
  const serialized = canonicalJson(state);
  if (/privateKey|private_key|secretKey|secret_key/i.test(serialized)) {
    throw new Error("owner state contains prohibited key material");
  }
  return state;
}

function writeState(path: string, state: OwnerDemoState): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${canonicalJson(parseState(state))}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

export function canonicalJson(value: Json | unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function readInput(path: string | undefined): OwnerDemoInput {
  if (!path) return dryRunInput();
  return JSON.parse(readFileSync(path, "utf8")) as OwnerDemoInput;
}

function parseArgs(argv: string[]) {
  const verb = argv[0];
  if (verb !== "publish" && verb !== "revoke")
    throw new Error("usage: demo:m1-owner publish|revoke --state <path>");
  const args = new Map<string, string | true>();
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args.set(key, true);
    else {
      args.set(key, next);
      index += 1;
    }
  }
  return {
    verb,
    mode: args.has("dry-run") ? "dry-run" : "live",
    inputPath: stringArg(args.get("input")),
    outPath: stringArg(args.get("out")),
    statePath: stringArg(args.get("state")),
    nodeEndpoint: stringArg(args.get("node-endpoint")),
    ownerNodeEndpoint: stringArg(args.get("owner-node-endpoint")),
    privateKeyEnv: stringArg(args.get("private-key-env")) ?? "TC_OWNER_PRIVATE_KEY",
  } as const;
}

function stringArg(value: string | true | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function runCli(argv: string[] = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.statePath) throw new Error("--state is required");
  const input = readInput(args.inputPath);
  const privateKey = args.mode === "live" ? process.env[args.privateKeyEnv] : undefined;
  const artifact =
    args.verb === "publish"
      ? (
          await runOwnerPublish({
            input,
            mode: args.mode,
            nodeEndpoint: args.nodeEndpoint,
            ownerNodeEndpoint: args.ownerNodeEndpoint,
            privateKey,
            statePath: args.statePath,
          })
        ).artifact
      : await runOwnerRevoke({
          input,
          mode: args.mode,
          privateKey,
          state: parseState(JSON.parse(readFileSync(args.statePath, "utf8"))),
        });
  const output = `${canonicalJson(artifact)}\n`;
  if (args.outPath) writeFileSync(args.outPath, output);
  else process.stdout.write(output);
}

if (import.meta.main) {
  runCli().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}

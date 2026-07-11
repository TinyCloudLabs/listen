import type { TinyCloudWeb } from "@tinycloud/web-sdk";
import {
  EIP191_JCS_SIGNATURE_SUITE,
  OWNER_NODE_ENDPOINT_SCHEMA,
  POLICY_ENGINE_RECORD_SCHEMA,
  POLICY_STATUS_SCHEMA,
  TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA,
  W3C_VC_CREDENTIAL_VERIFIER,
  composeTranscriptShareBootstrap,
  createAndSignPolicyStatus,
  createAndSignRequesterPolicyEngineRecord,
  createAndSignTranscriptSharePolicy,
  normalizePolicyCapability,
  validatePolicyEngineRecordSignedShape,
  type JsonObject,
  type JsonValue,
  type Policy,
  type TranscriptShareBootstrap,
  type PolicyCapability,
  type PolicyEngineRecord,
  type PolicyStatus,
  type SignedObjectSigner,
} from "@tinycloud/sdk-core/policy";
import {
  createListenTranscriptCapability,
  LISTEN_CONTENT_SPACE,
  LISTEN_TRANSCRIPT_RESOURCE_TYPE,
  LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES,
  listenTranscriptResourceId,
  type ApiClient,
} from "@listen/client";

import { resolveAppKvPath } from "./appManifest";
import type { ShareableConversationDetail } from "./listenShareLinks";

export const OPEN_CREDENTIALS_WITNESS_DID = "did:web:issuer.credentials.org";
export const REVOKE_COPY =
  "Access usually ends within 5 minutes. Anything already opened, downloaded, copied, or cached cannot be recalled.";
export const DEFAULT_POLICY_ENGINE_ENDPOINT = "https://node.tinycloud.xyz/policy-engine";
export const DEFAULT_POLICY_ENGINE_AUDIENCE = "urn:tinycloud:policy-engine:listen:m1";
export const DEFAULT_OWNER_NODE_ENDPOINT = "https://node.tinycloud.xyz";
export const OWNER_SHARE_TTL_DAYS = 30;

const SHARE_STORE_KEY = "listen:owner-transcript-shares:v1";
const DATE_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;
const ACTION_URN_RE = /^tinycloud\.(?:kv|sql|vfs)\/[A-Za-z][A-Za-z0-9._-]*$/;
const RAW_TRAVERSAL_RE = /(?:^|\/)\.\.?(?:\/|$)|\/\/|%2e|%2f|%5c/i;

export type ListenOwnerShareErrorCode =
  | "invalid-date-time"
  | "invalid-path"
  | "invalid-action"
  | "invalid-caveat"
  | "invalid-prototype"
  | "unknown-field"
  | "invalid-input"
  | "sdk-authoring-failed"
  | "transport-failed"
  | "signer-unavailable";

export class ListenOwnerShareError extends Error {
  readonly code: ListenOwnerShareErrorCode;

  constructor(code: ListenOwnerShareErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ListenOwnerShareError";
    this.code = code;
    if (options && "cause" in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface ListenOwnerShareCredentialRule {
  credentialClass: "w3c.vc/credential/v1";
  acceptedIssuers: readonly [typeof OPEN_CREDENTIALS_WITNESS_DID];
}

export interface ListenOwnerShareInput {
  conversationIds: readonly string[];
  createdAt?: string;
  expiresAt?: string;
}

export interface DisclosureConversation {
  conversationId: string;
  title: string;
  participants: string[];
  transcriptFields: string[];
  participantFields: string[];
  audioIncluded: boolean;
}

export interface ListenOwnerShareDraft {
  shareId: string;
  conversationIds: string[];
  details: ShareableConversationDetail[];
  capabilities: PolicyCapability[];
  disclosure: {
    conversations: DisclosureConversation[];
  };
  credentialRule: ListenOwnerShareCredentialRule;
  createdAt: string;
  expiresAt: string;
}

export interface PublishedListenOwnerShare {
  shareId: string;
  policyId: string;
  status: "active" | "revoked";
  createdAt: string;
  updatedAt: string;
  conversationIds: string[];
  credentialRule: ListenOwnerShareCredentialRule;
  disclosure: ListenOwnerShareDraft["disclosure"];
  bootstrap: TranscriptShareBootstrap;
  policyPath: string;
  statusPath: string;
  bootstrapPath: string;
  engineRecordPath: string;
}

export interface PublishedListenOwnerShareProjection {
  shares: PublishedListenOwnerShare[];
  quarantined: boolean;
  error?: string;
}

interface OwnerShareWriteSet {
  policy: Policy;
  policyStatus: PolicyStatus;
  engineRecord: PolicyEngineRecord;
  bootstrap: TranscriptShareBootstrap;
}

export interface ListenOwnerSharePublicationContext {
  grantIssuerDid?: string;
  ownerNodeEndpoint?: string;
  ownerSpaceId?: string;
}

type TinyCloudKvWriter = {
  put(path: string, value: string): Promise<unknown>;
};

function typedError(code: ListenOwnerShareErrorCode, message: string, cause?: unknown) {
  return new ListenOwnerShareError(code, message, cause === undefined ? undefined : { cause });
}

function mapUnknownError(err: unknown, fallback: ListenOwnerShareErrorCode): ListenOwnerShareError {
  if (err instanceof ListenOwnerShareError) return err;
  const sdkCode =
    typeof (err as { code?: unknown })?.code === "string" ? (err as { code: string }).code : "";
  if (sdkCode.includes("date")) return typedError("invalid-date-time", messageFrom(err), err);
  if (sdkCode.includes("path")) return typedError("invalid-path", messageFrom(err), err);
  if (sdkCode.includes("action")) return typedError("invalid-action", messageFrom(err), err);
  if (sdkCode.includes("caveat")) return typedError("invalid-caveat", messageFrom(err), err);
  if (sdkCode.includes("unknown-key")) return typedError("unknown-field", messageFrom(err), err);
  return typedError(fallback, messageFrom(err), err);
}

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function hasOwn(object: object, key: string): boolean {
  return Object.hasOwn(object, key);
}

function requirePlainRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw typedError("invalid-input", `${path} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw typedError("invalid-prototype", `${path} must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: unknown,
  allowed: readonly string[],
  path: string,
): Record<string, unknown> {
  const object = requirePlainRecord(value, path);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw typedError("unknown-field", `${path}.${key} is not supported`);
    }
  }
  return object;
}

export function assertStrictRfc3339DateTime(value: unknown, path = "$"): string {
  if (typeof value !== "string") {
    throw typedError("invalid-date-time", `${path} must be a strict RFC 3339 date-time`);
  }
  const match = value.match(DATE_TIME_RE);
  if (!match) {
    throw typedError("invalid-date-time", `${path} must be a strict RFC 3339 date-time`);
  }
  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue, fraction = ""] =
    match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const millisecond = Number(fraction.slice(0, 3).padEnd(3, "0"));
  if (
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    !Number.isInteger(millisecond)
  ) {
    throw typedError("invalid-date-time", `${path} must be a valid RFC 3339 date-time`);
  }
  const calendarTime = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const calendarDate = new Date(calendarTime);
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day ||
    calendarDate.getUTCHours() !== hour ||
    calendarDate.getUTCMinutes() !== minute ||
    calendarDate.getUTCSeconds() !== second
  ) {
    throw typedError("invalid-date-time", `${path} must be a valid RFC 3339 calendar date-time`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw typedError("invalid-date-time", `${path} must be a valid RFC 3339 date-time`);
  }
  return new Date(time).toISOString().replace(".000Z", "Z");
}

export function assertConcreteRawPath(path: unknown, field = "$.path"): string {
  if (typeof path !== "string" || path.length === 0) {
    throw typedError("invalid-path", `${field} must be a non-empty concrete path`);
  }
  if (
    path.endsWith("/") ||
    path.endsWith("/*") ||
    path.includes("*") ||
    RAW_TRAVERSAL_RE.test(path)
  ) {
    throw typedError("invalid-path", `${field} must be an exact non-traversing path`);
  }
  return path;
}

export function assertGrantableActionUrns(actions: unknown, field = "$.actions"): string[] {
  if (!Array.isArray(actions) || actions.length === 0) {
    throw typedError("invalid-action", `${field} must contain grantable action URNs`);
  }
  return actions.map((action, index) => {
    if (typeof action !== "string" || !ACTION_URN_RE.test(action) || action.includes("*")) {
      throw typedError("invalid-action", `${field}[${index}] must be a fully expanded action URN`);
    }
    return action;
  });
}

export function assertServiceNativeCaveats(capability: unknown): void {
  const object = requirePlainRecord(capability, "$.capability");
  if (!hasOwn(object, "caveats")) return;
  const service = object.service;
  if (service !== "tinycloud.sql") {
    throw typedError("invalid-caveat", "$.capability.caveats are not defined for this service");
  }
  const caveats = assertExactKeys(
    object.caveats,
    ["mode", "readOnly", "statements"],
    "$.capability.caveats",
  );
  if (
    caveats.mode !== "constrained-statements" ||
    caveats.readOnly !== true ||
    !Array.isArray(caveats.statements)
  ) {
    throw typedError("invalid-caveat", "$.capability.caveats must be SQL constrained statements");
  }
  caveats.statements.forEach((statement, index) => {
    const record = assertExactKeys(
      statement,
      ["name", "sql", "fixedParams"],
      `$.capability.caveats.statements[${index}]`,
    );
    if (
      typeof record.name !== "string" ||
      typeof record.sql !== "string" ||
      !Array.isArray(record.fixedParams)
    ) {
      throw typedError("invalid-caveat", `$.capability.caveats.statements[${index}] is malformed`);
    }
    record.fixedParams.forEach((param, paramIndex) => {
      const fixedParam = assertExactKeys(
        param,
        ["index", "value"],
        `$.capability.caveats.statements[${index}].fixedParams[${paramIndex}]`,
      );
      if (typeof fixedParam.index !== "number") {
        throw typedError(
          "invalid-caveat",
          `$.capability.caveats.statements[${index}].fixedParams[${paramIndex}] is malformed`,
        );
      }
    });
  });
}

export function validateOwnerShareInput(input: unknown): ListenOwnerShareInput {
  const object = assertExactKeys(input, ["conversationIds", "createdAt", "expiresAt"], "$");
  const ids = object.conversationIds;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => typeof id !== "string" || id.length === 0)
  ) {
    throw typedError("invalid-input", "$.conversationIds must contain selected conversation IDs");
  }
  return {
    conversationIds: [...new Set(ids)],
    ...(object.createdAt !== undefined
      ? { createdAt: assertStrictRfc3339DateTime(object.createdAt, "$.createdAt") }
      : {}),
    ...(object.expiresAt !== undefined
      ? { expiresAt: assertStrictRfc3339DateTime(object.expiresAt, "$.expiresAt") }
      : {}),
  };
}

function ownerDidFromSession(tcw: TinyCloudWeb): string {
  const session = tcw.session?.() as {
    address?: unknown;
    walletAddress?: unknown;
    chainId?: unknown;
  } | null;
  const address =
    typeof session?.walletAddress === "string" ? session.walletAddress : session?.address;
  const chainId = typeof session?.chainId === "number" ? session.chainId : 1;
  if (typeof address !== "string" || address.length === 0) {
    throw typedError(
      "signer-unavailable",
      "Reconnect your wallet before publishing a credentialed share.",
    );
  }
  return `did:pkh:eip155:${chainId}:${address}`;
}

function writerFromTinyCloud(tcw: TinyCloudWeb): TinyCloudKvWriter {
  const kv = (tcw as TinyCloudWeb & { kv?: Partial<TinyCloudKvWriter> }).kv;
  if (typeof kv?.put !== "function") {
    throw typedError("transport-failed", "TinyCloud KV is not available for owner-share records.");
  }
  return kv as TinyCloudKvWriter;
}

function signerFromTinyCloud(tcw: TinyCloudWeb, ownerDid: string): SignedObjectSigner {
  const provider = (
    tcw as TinyCloudWeb & {
      provider?: { getSigner?: () => { signMessage?: (value: Uint8Array) => Promise<string> } };
    }
  ).provider;
  const providerSigner = provider?.getSigner?.();
  if (typeof providerSigner?.signMessage !== "function") {
    throw typedError(
      "signer-unavailable",
      "Reconnect your wallet before publishing a credentialed share.",
    );
  }
  return {
    suite: EIP191_JCS_SIGNATURE_SUITE,
    signerDid: ownerDid,
    signDigest: (digest: Uint8Array) => providerSigner.signMessage(Uint8Array.from(digest)),
  };
}

function readResultData(result: unknown): unknown {
  if (result && typeof result === "object" && "ok" in result) {
    if ((result as { ok?: boolean }).ok === false) {
      const message = (result as { error?: { message?: unknown } }).error?.message;
      throw typedError(
        "transport-failed",
        typeof message === "string" ? message : "TinyCloud write failed",
      );
    }
  }
  return result;
}

function isoNow(): string {
  return new Date().toISOString().replace(".000Z", "Z");
}

function defaultExpiry(createdAt: string): string {
  return new Date(Date.parse(createdAt) + OWNER_SHARE_TTL_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(".000Z", "Z");
}

export function hasListenOwnerShareableAudio(detail: ShareableConversationDetail | null): boolean {
  void detail;
  return false;
}

function normalizedCapability(input: unknown): PolicyCapability {
  try {
    assertServiceNativeCaveats(input);
    const object = requirePlainRecord(input, "$.capability");
    assertConcreteRawPath(object.path, "$.capability.path");
    assertGrantableActionUrns(object.actions, "$.capability.actions");
    return normalizePolicyCapability(input);
  } catch (err) {
    throw mapUnknownError(err, "sdk-authoring-failed");
  }
}

function transcriptCapabilityFor(conversationId: string): PolicyCapability {
  return normalizedCapability(createListenTranscriptCapability(conversationId));
}

function participantNames(detail: ShareableConversationDetail): string[] {
  return detail.participants
    .map((participant) => {
      if (!participant || typeof participant !== "object") return null;
      const record = participant as Record<string, unknown>;
      return typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : typeof record.email === "string" && record.email.trim()
          ? record.email.trim()
          : typeof record.speaker_label === "string" && record.speaker_label.trim()
            ? record.speaker_label.trim()
            : null;
    })
    .filter((name): name is string => name !== null);
}

function sqlStatementFields(sql: unknown): string[] {
  if (typeof sql !== "string") return [];
  const match = sql.match(/^\s*SELECT\s+(.+?)\s+FROM\s+/is);
  if (!match?.[1]) return [];
  return match[1]
    .split(",")
    .map((field) => field.trim().replace(/\s+AS\s+.+$/i, ""))
    .filter((field) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(field));
}

function fixedParamConversationId(statement: Record<string, unknown>): string | null {
  const fixedParams = statement.fixedParams;
  if (!Array.isArray(fixedParams)) return null;
  for (const param of fixedParams) {
    if (!param || typeof param !== "object") continue;
    const record = param as Record<string, unknown>;
    if (record.index === 0 && typeof record.value === "string") return record.value;
  }
  return null;
}

function sqlDisclosureFieldsFor(
  capabilities: readonly PolicyCapability[],
  conversationId: string,
): { transcriptFields: string[]; participantFields: string[] } {
  const transcriptFields = new Set<string>();
  const participantFields = new Set<string>();

  for (const capability of capabilities) {
    if (capability.service !== "tinycloud.sql") continue;
    const caveats = capability.caveats;
    if (!caveats || typeof caveats !== "object" || Array.isArray(caveats)) continue;
    const statements = (caveats as Record<string, unknown>).statements;
    if (!Array.isArray(statements)) continue;

    for (const statement of statements) {
      if (!statement || typeof statement !== "object" || Array.isArray(statement)) continue;
      const record = statement as Record<string, unknown>;
      if (fixedParamConversationId(record) !== conversationId) continue;
      const name = typeof record.name === "string" ? record.name : "";
      const target = name === "listen.listParticipants" ? participantFields : transcriptFields;
      for (const field of sqlStatementFields(record.sql)) target.add(field);
    }
  }

  return {
    transcriptFields: [...transcriptFields],
    participantFields: [...participantFields],
  };
}

function createShareId(conversationIds: readonly string[], createdAt: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `listen-share-${conversationIds.length}-${Date.parse(createdAt).toString(36)}-${random}`;
}

export async function loadOwnerShareDetails(
  api: ApiClient,
  conversationIds: readonly string[],
): Promise<ShareableConversationDetail[]> {
  if (conversationIds.length === 0)
    throw typedError("invalid-input", "Select at least one transcript.");
  try {
    const details = await Promise.all(
      conversationIds.map((id) =>
        api.get<ShareableConversationDetail>(`/api/conversations/${encodeURIComponent(id)}`),
      ),
    );
    return details;
  } catch (err) {
    throw mapUnknownError(err, "transport-failed");
  }
}

export function composeListenOwnerShareDraft(
  details: readonly ShareableConversationDetail[],
  input: ListenOwnerShareInput,
): ListenOwnerShareDraft {
  try {
    const validated = validateOwnerShareInput(input);
    const detailById = new Map(details.map((detail) => [detail.conversation.id, detail]));
    const createdAt = validated.createdAt ?? isoNow();
    const expiresAt = validated.expiresAt ?? defaultExpiry(createdAt);
    const selectedDetails = validated.conversationIds.map((id) => {
      const detail = detailById.get(id);
      if (!detail) throw typedError("invalid-input", `Selected conversation ${id} was not loaded`);
      return detail;
    });

    const capabilities = selectedDetails.map((detail) =>
      transcriptCapabilityFor(detail.conversation.id),
    );

    const disclosureConversations = selectedDetails.map((detail) => {
      const fields = sqlDisclosureFieldsFor(capabilities, detail.conversation.id);
      return {
        conversationId: detail.conversation.id,
        title: detail.conversation.title,
        participants: participantNames(detail),
        transcriptFields: fields.transcriptFields,
        participantFields: fields.participantFields,
        audioIncluded: false,
      };
    });

    return {
      shareId: createShareId(validated.conversationIds, createdAt),
      conversationIds: [...validated.conversationIds],
      details: selectedDetails,
      capabilities,
      disclosure: {
        conversations: disclosureConversations,
      },
      credentialRule: {
        credentialClass: W3C_VC_CREDENTIAL_VERIFIER,
        acceptedIssuers: [OPEN_CREDENTIALS_WITNESS_DID],
      },
      createdAt,
      expiresAt,
    };
  } catch (err) {
    throw mapUnknownError(err, "sdk-authoring-failed");
  }
}

function credentialRuleJson(rule: ListenOwnerShareCredentialRule): JsonObject {
  return {
    verifier: rule.credentialClass,
    acceptedIssuers: [...rule.acceptedIssuers],
  };
}

function resourceHintJson(draft: ListenOwnerShareDraft): JsonObject {
  return {
    resourceType: LISTEN_TRANSCRIPT_RESOURCE_TYPE,
    resourceId: draft.shareId,
    sqlDatabaseHint: "conversations",
    sqlStatementHints: LISTEN_TRANSCRIPT_SQL_STATEMENT_TEMPLATES.map((statement) => statement.name),
    pathHints: [],
  };
}

async function composeWriteSet(
  draft: ListenOwnerShareDraft,
  ownerDid: string,
  signer: SignedObjectSigner,
  context: ListenOwnerSharePublicationContext,
): Promise<OwnerShareWriteSet> {
  try {
    const grantIssuerDid = context.grantIssuerDid ?? `${ownerDid}#listen-grant-issuer`;
    const engineRecord = await createAndSignRequesterPolicyEngineRecord(
      {
        ownerDid,
        endpoint: DEFAULT_POLICY_ENGINE_ENDPOINT,
        audience: DEFAULT_POLICY_ENGINE_AUDIENCE,
        grantIssuerDid,
        expiresAt: draft.expiresAt,
      },
      signer,
    );
    const policy = await createAndSignTranscriptSharePolicy(
      {
        ownerDid,
        signingKeyDid: ownerDid,
        createdAt: draft.createdAt,
        expiresAt: draft.expiresAt,
        resourceType: LISTEN_TRANSCRIPT_RESOURCE_TYPE,
        resourceId:
          draft.conversationIds.length === 1
            ? listenTranscriptResourceId(draft.conversationIds[0]!)
            : draft.shareId,
        permissionsCeiling: draft.capabilities,
        when: {
          evidence: {
            requirementId: "opencredentials-email",
            verifier: W3C_VC_CREDENTIAL_VERIFIER,
            requirements: {
              credentialClass: draft.credentialRule.credentialClass,
            },
            authority: {
              acceptedIssuers: [...draft.credentialRule.acceptedIssuers],
            },
            freshness: {
              maxStatusAgeSeconds: 300,
            },
          },
        },
        grant: {
          output: "portable-delegation",
          maxTtlSeconds: 300,
          delegationMode: "attenuable",
          revocation: "refresh_only",
        },
        disclosure: {
          denial: "code",
        },
        audit: {
          issuance: "security",
        },
      },
      signer,
    );
    const policyStatus = await createAndSignPolicyStatus(
      {
        schema: POLICY_STATUS_SCHEMA,
        policyId: policy.policyId,
        ownerDid,
        sequence: 1,
        disposition: "active",
        effectiveAt: draft.createdAt,
        signingKeyDid: ownerDid,
      },
      signer,
    );
    const bootstrap = composeTranscriptShareBootstrap({
      policyId: policy.policyId,
      policyEngineRecord: engineRecord,
      ownerNodeEndpoint: context.ownerNodeEndpoint ?? DEFAULT_OWNER_NODE_ENDPOINT,
      ownerSpaceId: context.ownerSpaceId ?? ownerDid,
      resourceHint: resourceHintJson(draft),
    });
    return { policy, policyStatus, engineRecord, bootstrap };
  } catch (err) {
    throw mapUnknownError(err, "sdk-authoring-failed");
  }
}

function sharePaths(shareId: string, policyId: string, engineRecordId: string) {
  const base = assertConcreteRawPath(`owner-shares/${shareId}`, "$.sharePath");
  return {
    policyPath: assertConcreteRawPath(resolveAppKvPath(`${base}/policy-${policyId}.json`)),
    statusPath: assertConcreteRawPath(resolveAppKvPath(`${base}/status.json`)),
    bootstrapPath: assertConcreteRawPath(resolveAppKvPath(`${base}/bootstrap.json`)),
    engineRecordPath: assertConcreteRawPath(
      resolveAppKvPath(`${base}/engine-${engineRecordId}.json`),
    ),
  };
}

async function writeJson(writer: TinyCloudKvWriter, path: string, value: unknown): Promise<void> {
  try {
    readResultData(await writer.put(path, JSON.stringify(value)));
  } catch (err) {
    throw mapUnknownError(err, "transport-failed");
  }
}

function parsePublishedShare(input: unknown): PublishedListenOwnerShare {
  const object = assertExactKeys(
    input,
    [
      "shareId",
      "policyId",
      "status",
      "createdAt",
      "updatedAt",
      "conversationIds",
      "credentialRule",
      "disclosure",
      "bootstrap",
      "policyPath",
      "statusPath",
      "bootstrapPath",
      "engineRecordPath",
    ],
    "$",
  );
  const status = object.status;
  if (status !== "active" && status !== "revoked") {
    throw typedError("invalid-input", "$.status must be active or revoked");
  }
  const conversationIds = object.conversationIds;
  if (!Array.isArray(conversationIds) || conversationIds.some((id) => typeof id !== "string")) {
    throw typedError("invalid-input", "$.conversationIds must contain strings");
  }
  if (typeof object.shareId !== "string" || object.shareId.length === 0) {
    throw typedError("invalid-input", "$.shareId must be a string");
  }
  if (typeof object.policyId !== "string" || object.policyId.length === 0) {
    throw typedError("invalid-input", "$.policyId must be a string");
  }
  const bootstrap = parseTranscriptShareBootstrap(object.bootstrap);
  if (bootstrap.policyId !== object.policyId) {
    throw typedError("invalid-input", "$.bootstrap.policyId must match $.policyId");
  }
  const expectedPaths = sharePaths(
    object.shareId,
    object.policyId,
    bootstrap.policyEngine.signedRecord.engineRecordId,
  );
  const policyPath = assertConcreteRawPath(object.policyPath, "$.policyPath");
  const statusPath = assertConcreteRawPath(object.statusPath, "$.statusPath");
  const bootstrapPath = assertConcreteRawPath(object.bootstrapPath, "$.bootstrapPath");
  const engineRecordPath = assertConcreteRawPath(object.engineRecordPath, "$.engineRecordPath");
  if (
    policyPath !== expectedPaths.policyPath ||
    statusPath !== expectedPaths.statusPath ||
    bootstrapPath !== expectedPaths.bootstrapPath ||
    engineRecordPath !== expectedPaths.engineRecordPath
  ) {
    throw typedError("invalid-input", "$.paths must match the SDK-composed share coordinates");
  }
  return {
    shareId: object.shareId,
    policyId: object.policyId,
    status,
    createdAt: assertStrictRfc3339DateTime(object.createdAt, "$.createdAt"),
    updatedAt: assertStrictRfc3339DateTime(object.updatedAt, "$.updatedAt"),
    conversationIds: conversationIds as string[],
    credentialRule: parseCredentialRule(object.credentialRule),
    disclosure: parseDisclosure(object.disclosure),
    bootstrap,
    policyPath,
    statusPath,
    bootstrapPath,
    engineRecordPath,
  };
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw typedError("invalid-input", `${path} must contain strings`);
  }
  return value;
}

function parseCredentialRule(input: unknown): ListenOwnerShareCredentialRule {
  const object = assertExactKeys(input, ["credentialClass", "acceptedIssuers"], "$.credentialRule");
  if (object.credentialClass !== W3C_VC_CREDENTIAL_VERIFIER) {
    throw typedError("invalid-input", "$.credentialRule.credentialClass is not supported");
  }
  const issuers = stringArray(object.acceptedIssuers, "$.credentialRule.acceptedIssuers");
  if (issuers.length !== 1 || issuers[0] !== OPEN_CREDENTIALS_WITNESS_DID) {
    throw typedError("invalid-input", "$.credentialRule.acceptedIssuers is not supported");
  }
  return {
    credentialClass: W3C_VC_CREDENTIAL_VERIFIER,
    acceptedIssuers: [OPEN_CREDENTIALS_WITNESS_DID],
  };
}

function parseDisclosure(input: unknown): ListenOwnerShareDraft["disclosure"] {
  const object = assertExactKeys(input, ["conversations"], "$.disclosure");
  if (!Array.isArray(object.conversations)) {
    throw typedError("invalid-input", "$.disclosure.conversations must be an array");
  }
  return {
    conversations: object.conversations.map((conversation, index) => {
      const item = assertExactKeys(
        conversation,
        [
          "conversationId",
          "title",
          "participants",
          "transcriptFields",
          "participantFields",
          "audioIncluded",
        ],
        `$.disclosure.conversations[${index}]`,
      );
      if (typeof item.conversationId !== "string" || typeof item.title !== "string") {
        throw typedError("invalid-input", `$.disclosure.conversations[${index}] is malformed`);
      }
      if (typeof item.audioIncluded !== "boolean") {
        throw typedError(
          "invalid-input",
          `$.disclosure.conversations[${index}].audioIncluded must be boolean`,
        );
      }
      return {
        conversationId: item.conversationId,
        title: item.title,
        participants: stringArray(
          item.participants,
          `$.disclosure.conversations[${index}].participants`,
        ),
        transcriptFields: stringArray(
          item.transcriptFields,
          `$.disclosure.conversations[${index}].transcriptFields`,
        ),
        participantFields: stringArray(
          item.participantFields,
          `$.disclosure.conversations[${index}].participantFields`,
        ),
        audioIncluded: item.audioIncluded,
      };
    }),
  };
}

function parseJsonObject(input: unknown, path: string): JsonObject {
  const object = requirePlainRecord(input, path);
  for (const value of Object.values(object)) {
    if (value === undefined || typeof value === "function" || typeof value === "symbol") {
      throw typedError("invalid-input", `${path} must contain JSON values`);
    }
  }
  return object as JsonObject;
}

function parseResourceHint(input: unknown): JsonObject {
  const object = assertExactKeys(
    input,
    ["resourceType", "resourceId", "sqlDatabaseHint", "sqlStatementHints", "pathHints"],
    "$.bootstrap.resourceHint",
  );
  if (
    object.resourceType !== LISTEN_TRANSCRIPT_RESOURCE_TYPE ||
    typeof object.resourceId !== "string" ||
    object.sqlDatabaseHint !== "conversations"
  ) {
    throw typedError("invalid-input", "$.bootstrap.resourceHint is malformed");
  }
  stringArray(object.sqlStatementHints, "$.bootstrap.resourceHint.sqlStatementHints");
  stringArray(object.pathHints, "$.bootstrap.resourceHint.pathHints");
  return parseJsonObject(object, "$.bootstrap.resourceHint");
}

function parseTranscriptShareBootstrap(input: unknown): TranscriptShareBootstrap {
  const object = assertExactKeys(
    input,
    ["schema", "policyId", "policyEngine", "ownerNode", "resourceHint"],
    "$.bootstrap",
  );
  if (object.schema !== TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA || typeof object.policyId !== "string") {
    throw typedError("invalid-input", "$.bootstrap is malformed");
  }
  const policyEngine = assertExactKeys(
    object.policyEngine,
    ["endpoint", "audience", "supportedEvidenceVerifiers", "signedRecord"],
    "$.bootstrap.policyEngine",
  );
  if (typeof policyEngine.endpoint !== "string" || typeof policyEngine.audience !== "string") {
    throw typedError("invalid-input", "$.bootstrap.policyEngine is malformed");
  }
  const verifiers = stringArray(
    policyEngine.supportedEvidenceVerifiers,
    "$.bootstrap.policyEngine.supportedEvidenceVerifiers",
  );
  if (verifiers.length !== 1 || verifiers[0] !== W3C_VC_CREDENTIAL_VERIFIER) {
    throw typedError(
      "invalid-input",
      "$.bootstrap.policyEngine.supportedEvidenceVerifiers is not supported",
    );
  }
  const signedRecord = validatePolicyEngineRecordSignedShape(policyEngine.signedRecord);
  if (signedRecord.schema !== POLICY_ENGINE_RECORD_SCHEMA) {
    throw typedError("invalid-input", "$.bootstrap.policyEngine.signedRecord is malformed");
  }
  const ownerNode = assertExactKeys(
    object.ownerNode,
    ["schema", "endpoint", "spaceId"],
    "$.bootstrap.ownerNode",
  );
  if (
    ownerNode.schema !== OWNER_NODE_ENDPOINT_SCHEMA ||
    typeof ownerNode.endpoint !== "string" ||
    typeof ownerNode.spaceId !== "string"
  ) {
    throw typedError("invalid-input", "$.bootstrap.ownerNode is malformed");
  }
  return {
    schema: TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA,
    policyId: object.policyId,
    policyEngine: {
      endpoint: policyEngine.endpoint,
      audience: policyEngine.audience,
      supportedEvidenceVerifiers: [W3C_VC_CREDENTIAL_VERIFIER],
      signedRecord,
    },
    ownerNode: {
      schema: OWNER_NODE_ENDPOINT_SCHEMA,
      endpoint: ownerNode.endpoint,
      spaceId: ownerNode.spaceId,
    },
    resourceHint: parseResourceHint(object.resourceHint),
  };
}

export async function publishListenOwnerShare(
  tcw: TinyCloudWeb,
  draft: ListenOwnerShareDraft,
  context: ListenOwnerSharePublicationContext = {},
): Promise<PublishedListenOwnerShare> {
  const ownerDid = ownerDidFromSession(tcw);
  const signer = signerFromTinyCloud(tcw, ownerDid);
  const writer = writerFromTinyCloud(tcw);
  const writeSet = await composeWriteSet(draft, ownerDid, signer, context);
  const paths = sharePaths(
    draft.shareId,
    writeSet.policy.policyId,
    writeSet.engineRecord.engineRecordId,
  );

  await writeJson(writer, paths.policyPath, writeSet.policy);
  await writeJson(writer, paths.engineRecordPath, writeSet.engineRecord);
  await writeJson(writer, paths.statusPath, writeSet.policyStatus);
  await writeJson(writer, paths.bootstrapPath, writeSet.bootstrap);

  const published = parsePublishedShare({
    shareId: draft.shareId,
    policyId: writeSet.policy.policyId,
    status: "active",
    createdAt: draft.createdAt,
    updatedAt: draft.createdAt,
    conversationIds: draft.conversationIds,
    credentialRule: draft.credentialRule,
    disclosure: draft.disclosure,
    bootstrap: writeSet.bootstrap,
    ...paths,
  });
  rememberPublishedShare(published);
  return published;
}

export async function revokeListenOwnerShare(
  tcw: TinyCloudWeb,
  share: PublishedListenOwnerShare,
): Promise<PublishedListenOwnerShare> {
  try {
    const ownerDid = ownerDidFromSession(tcw);
    const signer = signerFromTinyCloud(tcw, ownerDid);
    const writer = writerFromTinyCloud(tcw);
    const effectiveAt = isoNow();
    const status = await createAndSignPolicyStatus(
      {
        schema: POLICY_STATUS_SCHEMA,
        policyId: share.policyId,
        ownerDid,
        sequence: 2,
        disposition: "revoked",
        effectiveAt,
        reasonCode: "owner-revoked",
        signingKeyDid: ownerDid,
      },
      signer,
    );
    await writeJson(writer, share.statusPath, status);
    const revoked = parsePublishedShare({ ...share, status: "revoked", updatedAt: effectiveAt });
    rememberPublishedShare(revoked);
    return revoked;
  } catch (err) {
    throw mapUnknownError(err, "transport-failed");
  }
}

function storedShareProjection(): PublishedListenOwnerShareProjection {
  if (typeof window === "undefined") return { shares: [], quarantined: false };
  try {
    const raw = window.localStorage.getItem(SHARE_STORE_KEY);
    if (!raw) return { shares: [], quarantined: false };
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw typedError("invalid-input", "Persisted owner share records must be an array");
    }
    return { shares: parsed.map(parsePublishedShare), quarantined: false };
  } catch (err) {
    return {
      shares: [],
      quarantined: true,
      error: err instanceof Error ? err.message : "Persisted owner share records are malformed",
    };
  }
}

function rememberPublishedShare(share: PublishedListenOwnerShare): void {
  if (typeof window === "undefined") return;
  try {
    const next = [
      share,
      ...storedShareProjection().shares.filter((item) => item.shareId !== share.shareId),
    ];
    window.localStorage.setItem(SHARE_STORE_KEY, JSON.stringify(next));
  } catch {
    // Local share history is only a projection of owner-space writes.
  }
}

export function listPublishedListenOwnerShares(): PublishedListenOwnerShare[] {
  return storedShareProjection().shares;
}

export function getPublishedListenOwnerShareProjection(): PublishedListenOwnerShareProjection {
  return storedShareProjection();
}

export function jsonRecord(value: JsonObject): JsonObject {
  return value;
}

export function jsonValue(value: JsonValue): JsonValue {
  return value;
}

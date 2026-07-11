import { InvokeFunction } from '@tinycloud/sdk-services';
import { P as PolicyCapability } from '../capability-DpdAwc1W.js';

declare const REQUESTER_NEAR_EXPIRY_SECONDS = 30;
declare const REQUESTER_ENGINE_RETRY_ATTEMPTS = 3;
declare const REQUESTER_ENGINE_RETRY_MAX_DELAY_MS = 250;
declare const POLICY_ENGINE_CHALLENGE_REQUEST_SCHEMA: "xyz.tinycloud.policy-engine/challenge-request/v0";
declare const POLICY_ENGINE_CHALLENGE_RESPONSE_SCHEMA: "xyz.tinycloud.policy/challenge/v0";
declare const POLICY_ENGINE_RESOLVE_REQUEST_SCHEMA: "xyz.tinycloud.policy/presentation/v0";
declare const POLICY_ENGINE_DENIAL_SCHEMA: "xyz.tinycloud.policy-engine/denial/v0";
declare const HOLDER_KEY_BINDING_PRESENTATION_SCHEMA: "xyz.tinycloud.policy/presentation/v0";
declare const PORTABLE_DELEGATION_SCHEMA: "xyz.tinycloud.policy/portable-delegation/v0";
declare const POLICY_ENGINE_GRANT_PRESENTATION_DENIAL_CODES: readonly ["schema-invalid", "challenge-not-found", "challenge-expired", "challenge-nonce-consumed", "presentation-expired", "presentation-audience-mismatch", "presentation-evidence-missing", "digest-mismatch", "evidence-requirement-unknown", "evidence-requirement-duplicate", "holder-signature-invalid", "holder-signature-signer-mismatch", "id-mismatch", "requested-capabilities-exceeded", "requested-capabilities-hash-mismatch", "evidence-authority-missing", "evidence-credential-invalid", "evidence-domain-invalid", "evidence-domain-missing", "evidence-freshness-expired", "evidence-freshness-unestablishable", "evidence-issuer-missing", "evidence-issuer-untrusted", "evidence-presentation-invalid", "evidence-requirements-invalid", "evidence-verifier-unsupported", "enrollment-binding-mismatch", "enrollment-expired", "enrollment-not-yet-valid", "enrollment-out-of-scope", "enrollment-revoked", "enrollment-revoked-irreversible", "enrollment-status-rollback", "signature-invalid", "signer-not-authorized", "audience-mismatch", "capability-not-contained", "evidence-invalid", "evidence-missing", "evidence-stale", "evidence-subject-mismatch", "evidence-untrusted", "grant-ttl-exceeds-policy", "holder-did-mismatch", "holder-key-not-permitted", "holder-signature-invalid", "owner-mismatch", "policy-expired", "policy-inactive", "policy-not-found", "policy-not-satisfied", "policy-revoked", "policy-status-rollback", "rate-limited"];
type PolicyEngineGrantPresentationDenialCode = (typeof POLICY_ENGINE_GRANT_PRESENTATION_DENIAL_CODES)[number];
type TranscriptRequesterErrorCode = "requester-bootstrap-malformed" | "requester-bootstrap-unknown-key" | "requester-engine-record-signature-invalid" | "requester-engine-record-owner-mismatch" | "requester-engine-record-audience-mismatch" | "requester-engine-record-endpoint-mismatch" | "requester-engine-record-invalid" | "requester-engine-unreachable" | "requester-engine-response-invalid" | "requester-renewal-required" | "requester-challenge-reused" | "requester-presentation-invalid" | "requester-delegation-invalid" | "requester-delegation-wrong-holder" | "requester-delegation-not-refresh-only" | "requester-delegation-ttl-excessive" | "requester-delegation-capability-wider" | "requester-owner-node-endpoint-invalid" | "requester-delegation-import-failed" | "requester-invocation-signer-required" | "requester-invocation-signer-mismatch" | "requester-node-denied" | "requester-node-unreachable" | "requester-node-response-invalid" | "requester-access-not-contained" | "requester-access-denied" | "requester-access-unreachable" | "requester-access-ended" | `policy-engine-denied-${PolicyEngineGrantPresentationDenialCode}`;
type TranscriptRequesterErrorState = "bootstrap-invalid" | "denied" | "unreachable" | "renewal-required" | "access-ended" | "invalid" | "not-contained";
declare class TranscriptRequesterError extends Error {
    readonly code: TranscriptRequesterErrorCode;
    readonly state: TranscriptRequesterErrorState;
    readonly denialCode?: PolicyEngineGrantPresentationDenialCode;
    readonly status?: number;
    constructor(code: TranscriptRequesterErrorCode, message: string, state?: TranscriptRequesterErrorState, denialCode?: PolicyEngineGrantPresentationDenialCode, status?: number);
}
interface RequesterHttpRequest {
    readonly method: "POST" | "GET";
    readonly url: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: unknown;
}
interface RequesterHttpResponse {
    readonly status: number;
    readonly body: unknown;
    /** Required for owner-node requests; the transport reports the non-redirected final URL. */
    readonly finalUrl?: string;
    /** Required for owner-node requests; the transport reports the actual connected IP. */
    readonly resolvedAddress?: string;
}
interface RequesterEndpointResolution {
    readonly addresses: readonly string[];
}
interface RequesterTransport {
    request(request: RequesterHttpRequest): Promise<RequesterHttpResponse>;
    /** Resolve before egress so the requester can pin public addresses and detect rebinding. */
    resolveEndpoint?(endpoint: string): Promise<RequesterEndpointResolution>;
}
interface RequesterInvocationCapability {
    readonly holderDid: string;
    readonly verificationMethod: string;
    readonly jwk: object;
    readonly invoke: InvokeFunction;
}
interface HolderKeyBindingPresentation {
    readonly schema: typeof HOLDER_KEY_BINDING_PRESENTATION_SCHEMA;
    readonly policyId: string;
    readonly eligibleSubjectDid: string;
    readonly holderDid: string;
    readonly holderBinding: unknown;
    readonly requestedCapabilities: readonly PolicyCapability[];
    readonly requestedCapabilitiesHash: string;
    readonly audience: string;
    readonly nonce: string;
    readonly expiresAt: string;
    readonly evidence?: readonly unknown[];
    readonly holderSignature: {
        readonly suite: string;
        readonly signerDid: string;
        readonly value: string;
    };
}
interface RequesterSigningCapability {
    readonly holderDid: string;
    readonly keyId: string;
    readonly suite?: string;
    readonly holderBinding?: unknown;
    readonly eligibleSubjectDid?: string;
    readonly evidence?: readonly unknown[];
    signGrantPresentation?(input: {
        readonly schema: typeof HOLDER_KEY_BINDING_PRESENTATION_SCHEMA;
        readonly policyId: string;
        readonly eligibleSubjectDid: string;
        readonly holderDid: string;
        readonly holderBinding: unknown;
        readonly requestedCapabilities: readonly PolicyCapability[];
        readonly requestedCapabilitiesHash: string;
        readonly audience: string;
        readonly nonce: string;
        readonly expiresAt: string;
        readonly evidence?: readonly unknown[];
    }): Promise<string> | string;
    signKeyBinding(input: {
        readonly schema: typeof HOLDER_KEY_BINDING_PRESENTATION_SCHEMA;
        readonly policyId?: string;
        readonly eligibleSubjectDid?: string;
        readonly holderDid: string;
        readonly holderBinding?: unknown;
        readonly requestedCapabilities?: readonly PolicyCapability[];
        readonly requestedCapabilitiesHash?: string;
        readonly audience: string;
        readonly nonce: string;
        readonly challengeId: string;
        readonly issuedAt: string;
        readonly keyId: string;
    }): Promise<string> | string;
}
interface PortableDelegation {
    readonly schema?: typeof PORTABLE_DELEGATION_SCHEMA;
    readonly delegationId: string;
    readonly policyId: string;
    readonly issuerDid: string;
    readonly holderDid: string;
    readonly audience?: string;
    readonly issuedAt: string;
    readonly expiresAt: string;
    readonly terminal: boolean;
    readonly maxTtlSeconds: number;
    readonly capabilities: readonly PolicyCapability[];
    readonly encoded?: string;
}
interface TranscriptRequesterOptions {
    readonly bootstrap: unknown;
    readonly requesterDid: string;
    readonly ownerDid: string;
    readonly audience: string;
    readonly grantIssuerDid: string;
    readonly transport: RequesterTransport;
    readonly signingCapability?: RequesterSigningCapability;
    readonly invocationCapability?: RequesterInvocationCapability;
    readonly eligibleSubjectDid?: string;
    readonly holderBinding?: unknown;
    readonly evidence?: readonly unknown[];
    readonly presentationTtlSeconds?: number;
    readonly now?: () => Date;
    readonly sleep?: (milliseconds: number) => Promise<void>;
    readonly random?: () => number;
    readonly engineRetryAttempts?: number;
}
interface TranscriptRequesterReadSqlResult {
    readonly rows: readonly unknown[];
}
interface TranscriptRequesterReadKvResult {
    readonly value: unknown;
}
declare const LISTEN_SQL_STATEMENT_CATALOG: readonly [{
    readonly name: "listen.getConversation";
    readonly sql: "SELECT id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, transcript_json, transcript_text, created_at, updated_at FROM conversation WHERE id = ?";
    readonly fixedParams: readonly [{
        readonly index: 0;
        readonly value: "{conversationId}";
    }];
}, {
    readonly name: "listen.listParticipants";
    readonly sql: "SELECT id, name, email, speaker_label FROM participant WHERE conversation_id = ? ORDER BY COALESCE(speaker_label, name), id";
    readonly fixedParams: readonly [{
        readonly index: 0;
        readonly value: "{conversationId}";
    }];
}];
type ListenSqlStatementName = (typeof LISTEN_SQL_STATEMENT_CATALOG)[number]["name"];
declare class TranscriptRequester {
    private readonly bootstrap;
    private readonly requesterDid;
    private readonly ownerDid;
    private readonly audience;
    private readonly grantIssuerDid;
    private readonly transport;
    private readonly signingCapability?;
    private readonly invocationCapability?;
    private readonly ownerNodeAddresses;
    private readonly now;
    private readonly sleep;
    private readonly random;
    private readonly engineRetryAttempts;
    private readonly requestedCapabilities;
    private readonly requestedCapabilitiesHash;
    private readonly eligibleSubjectDid;
    private readonly holderBinding;
    private readonly evidence?;
    private readonly presentationTtlSeconds;
    private readonly usedChallengeNonces;
    private importedDelegation?;
    private importedDelegationCid?;
    private accessEnded;
    private constructor();
    static create(options: TranscriptRequesterOptions): Promise<TranscriptRequester>;
    get accessState(): "active" | "needs-renewal" | "access-ended";
    readSql(statementName: ListenSqlStatementName): Promise<TranscriptRequesterReadSqlResult>;
    readKv(path: string): Promise<TranscriptRequesterReadKvResult>;
    private nativeInvoke;
    private ensureFreshDelegation;
    private recordAccessEnded;
    private obtainChallenge;
    private mintPresentation;
    private resolveOnce;
    private importPortableDelegation;
    private assertOwnerNodeResponse;
    private assertContainedByDelegation;
    private sqlAccessCapabilityForDelegation;
    private requiresRenewal;
    private challengeRequestWithRetry;
    private resolveRequestOnce;
}
declare function createTranscriptRequester(options: TranscriptRequesterOptions): Promise<TranscriptRequester>;
declare function deriveDelegationCid(encoded: string): string;

export { HOLDER_KEY_BINDING_PRESENTATION_SCHEMA, type HolderKeyBindingPresentation, LISTEN_SQL_STATEMENT_CATALOG, type ListenSqlStatementName, POLICY_ENGINE_CHALLENGE_REQUEST_SCHEMA, POLICY_ENGINE_CHALLENGE_RESPONSE_SCHEMA, POLICY_ENGINE_DENIAL_SCHEMA, POLICY_ENGINE_GRANT_PRESENTATION_DENIAL_CODES, POLICY_ENGINE_RESOLVE_REQUEST_SCHEMA, PORTABLE_DELEGATION_SCHEMA, type PolicyEngineGrantPresentationDenialCode, type PortableDelegation, REQUESTER_ENGINE_RETRY_ATTEMPTS, REQUESTER_ENGINE_RETRY_MAX_DELAY_MS, REQUESTER_NEAR_EXPIRY_SECONDS, type RequesterEndpointResolution, type RequesterHttpRequest, type RequesterHttpResponse, type RequesterInvocationCapability, type RequesterSigningCapability, type RequesterTransport, TranscriptRequester, TranscriptRequesterError, type TranscriptRequesterErrorCode, type TranscriptRequesterErrorState, type TranscriptRequesterOptions, type TranscriptRequesterReadKvResult, type TranscriptRequesterReadSqlResult, createTranscriptRequester, deriveDelegationCid };

import { P as PolicyEngineRecord, S as SignedObjectSigner, a as Policy, U as UnsignedPolicyEngineRecord } from '../signed-object-BHkLbCXI.js';
export { E as ED25519_JCS_SIGNATURE_SUITE, b as EIP191_JCS_SIGNATURE_SUITE, J as JsonObject, c as POLICY_ENGINE_RECORD_SCHEMA, d as POLICY_SCHEMA, e as POLICY_STATUS_SCHEMA, f as PolicyStatus, g as SignatureMaterialError, h as SignatureSuite, i as SignatureVerificationError, j as SignedObjectCanonicalizationError, k as SignedObjectDigestError, l as SignedObjectErrorCode, m as SignedObjectIdError, n as SignedObjectKind, o as SignedObjectMaterial, p as SignedObjectProfileError, q as SignedObjectSchemaError, r as SignedObjectSignature, s as SignedObjectVerificationResult, t as SignedPolicyObject, u as SigningKeyBindingError, v as UnsignedPolicy, w as UnsignedPolicyObject, x as UnsignedPolicyStatus, y as UnsupportedSignatureSuiteError, z as canonicalizeSignedObjectUnsigned, A as createAndSignPolicy, B as createAndSignPolicyEngineRecord, C as createAndSignPolicyStatus, D as createAndSignSignedObject, F as deriveSignedObjectMaterial, G as signedObjectIdFor, H as toSignedObjectError, I as validatePolicyEngineRecordSigned, K as validatePolicyEngineRecordSignedShape, L as validatePolicyEngineRecordUnsigned, M as validatePolicySigned, N as validatePolicySignedShape, O as validatePolicyStatusSigned, Q as validatePolicyStatusSignedShape, R as validatePolicyStatusUnsigned, T as validatePolicyUnsigned, V as verifyPolicy, W as verifyPolicyEngineRecord, X as verifyPolicyStatus, Y as verifySignedObject } from '../signed-object-BHkLbCXI.js';
import { J as JsonObject, a as PolicyCapabilityError } from '../capability-DpdAwc1W.js';
export { b as JsonValue, P as PolicyCapability, c as PolicyCapabilityErrorCode, d as canonicalizePolicyCapability, j as jcsCanonicalize, n as normalizeJson, e as normalizePolicyCapability, p as policyCapabilityContains, f as policyCapabilityDigestHex, s as serializeJcsJson } from '../capability-DpdAwc1W.js';

declare const TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA: "xyz.tinycloud.exchange/transcript-bootstrap/v0";
declare const OWNER_NODE_ENDPOINT_SCHEMA: "xyz.tinycloud.exchange/owner-node-endpoint/v1";
declare const POLICY_VERSION_V0: "v0";
declare const W3C_VC_CREDENTIAL_VERIFIER: "w3c.vc/credential/v1";
type PolicyAuthoringErrorCode = PolicyCapabilityError["code"] | "policy-authoring-malformed" | "policy-authoring-unknown-key" | "policy-engine-record-absent" | "policy-engine-record-date-invalid" | "policy-engine-record-signature-invalid" | "policy-engine-record-audience-mismatch" | "policy-engine-record-expired" | "policy-engine-record-owner-mismatch" | "policy-engine-record-grant-issuer-mismatch" | "policy-engine-record-policy-version-unsupported" | "policy-engine-record-evidence-verifier-unsupported" | "transcript-share-bootstrap-malformed";
declare class PolicyAuthoringError extends Error {
    readonly code: PolicyAuthoringErrorCode;
    constructor(code: PolicyAuthoringErrorCode, message: string);
}
interface CreateTranscriptSharePolicyInput {
    readonly ownerDid: string;
    readonly signingKeyDid: string;
    readonly createdAt: string;
    readonly expiresAt?: string;
    readonly resourceType: string;
    readonly resourceId: string;
    readonly permissionsCeiling: readonly unknown[];
    readonly when: JsonObject;
    readonly grant: JsonObject;
    readonly disclosure?: JsonObject;
    readonly audit?: JsonObject;
}
interface TranscriptShareBootstrap {
    readonly schema: typeof TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA;
    readonly policyId: string;
    readonly policyEngine: {
        readonly endpoint: string;
        readonly audience: string;
        readonly supportedEvidenceVerifiers: readonly [typeof W3C_VC_CREDENTIAL_VERIFIER];
        readonly signedRecord: PolicyEngineRecord;
    };
    /** Untrusted routing hint. Authority comes only from delegation/invocation validation. */
    readonly ownerNode: {
        readonly schema: typeof OWNER_NODE_ENDPOINT_SCHEMA;
        readonly endpoint: string;
        readonly spaceId: string;
    };
    readonly resourceHint: JsonObject;
}
interface ComposeTranscriptShareBootstrapInput {
    readonly policyId: string;
    readonly policyEngineRecord: PolicyEngineRecord;
    readonly ownerNodeEndpoint: string;
    readonly ownerSpaceId: string;
    readonly resourceHint: JsonObject;
}
interface CreatePolicyEngineRecordInput {
    readonly ownerDid: string;
    readonly endpoint: string;
    readonly audience: string;
    readonly grantIssuerDid: string;
    readonly expiresAt: string;
    readonly supportedPolicyVersions?: readonly string[];
    readonly supportedEvidenceVerifiers?: readonly string[];
}
interface VerifyPolicyEngineRecordOptions {
    readonly signedRecord: unknown;
    readonly ownerDid: string;
    readonly audience: string;
    readonly grantIssuerDid: string;
    readonly now: string;
    readonly requiredPolicyVersion?: string;
    readonly requiredEvidenceVerifier?: string;
}
/**
 * Author a transcript-sharing Policy from already-resolved Listen-adapter
 * PolicyCapability JSON. Manifest PermissionEntry shapes are refused here; the
 * SDK does not expand or invent permissions while signing authority-bearing
 * objects.
 */
declare function createAndSignTranscriptSharePolicy(input: CreateTranscriptSharePolicyInput, signer: SignedObjectSigner): Promise<Policy>;
declare function createUnsignedPolicyEngineRecord(input: CreatePolicyEngineRecordInput): UnsignedPolicyEngineRecord;
declare function createAndSignRequesterPolicyEngineRecord(input: CreatePolicyEngineRecordInput, signer: SignedObjectSigner): Promise<PolicyEngineRecord>;
/**
 * Compose the SDK-level transcript-share bootstrap record. This record is not
 * an invitation and is not authority; it only tells a requester where to ask
 * and which policy id to reference.
 */
declare function composeTranscriptShareBootstrap(input: ComposeTranscriptShareBootstrapInput): TranscriptShareBootstrap;
/**
 * Requester-side authentication gate for policy-engine endpoints. A requester
 * MUST NOT send credential evidence or call /resolve unless this verification
 * succeeds.
 */
declare function verifyPolicyEngineRecordForRequester(options: VerifyPolicyEngineRecordOptions): Promise<PolicyEngineRecord>;

export { type ComposeTranscriptShareBootstrapInput, type CreatePolicyEngineRecordInput, type CreateTranscriptSharePolicyInput, OWNER_NODE_ENDPOINT_SCHEMA, POLICY_VERSION_V0, Policy, PolicyAuthoringError, type PolicyAuthoringErrorCode, PolicyCapabilityError, PolicyEngineRecord, SignedObjectSigner, TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA, type TranscriptShareBootstrap, UnsignedPolicyEngineRecord, type VerifyPolicyEngineRecordOptions, W3C_VC_CREDENTIAL_VERIFIER, composeTranscriptShareBootstrap, createAndSignRequesterPolicyEngineRecord, createAndSignTranscriptSharePolicy, createUnsignedPolicyEngineRecord, verifyPolicyEngineRecordForRequester };

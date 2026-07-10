import { J as JsonValue, P as PolicyEngineRecord, S as SignedObjectSigner, a as Policy, U as UnsignedPolicyEngineRecord } from '../signed-object-CPfSG1iS.js';
export { E as ED25519_JCS_SIGNATURE_SUITE, b as EIP191_JCS_SIGNATURE_SUITE, c as JsonObject, d as POLICY_ENGINE_RECORD_SCHEMA, e as POLICY_SCHEMA, f as POLICY_STATUS_SCHEMA, g as PolicyStatus, h as SignatureMaterialError, i as SignatureSuite, j as SignatureVerificationError, k as SignedObjectCanonicalizationError, l as SignedObjectDigestError, m as SignedObjectErrorCode, n as SignedObjectIdError, o as SignedObjectKind, p as SignedObjectMaterial, q as SignedObjectProfileError, r as SignedObjectSchemaError, s as SignedObjectSignature, t as SignedObjectVerificationResult, u as SignedPolicyObject, v as SigningKeyBindingError, w as UnsignedPolicy, x as UnsignedPolicyObject, y as UnsignedPolicyStatus, z as UnsupportedSignatureSuiteError, A as canonicalizeSignedObjectUnsigned, B as createAndSignPolicy, C as createAndSignPolicyEngineRecord, D as createAndSignPolicyStatus, F as createAndSignSignedObject, G as deriveSignedObjectMaterial, H as jcsCanonicalize, I as normalizeJson, K as serializeJcsJson, L as signedObjectIdFor, M as toSignedObjectError, N as validatePolicyEngineRecordSigned, O as validatePolicyEngineRecordSignedShape, Q as validatePolicyEngineRecordUnsigned, R as validatePolicySigned, T as validatePolicySignedShape, V as validatePolicyStatusSigned, W as validatePolicyStatusSignedShape, X as validatePolicyStatusUnsigned, Y as validatePolicyUnsigned, Z as verifyPolicy, _ as verifyPolicyEngineRecord, $ as verifyPolicyStatus, a0 as verifySignedObject } from '../signed-object-CPfSG1iS.js';

type PolicyCapabilityErrorCode = "policy-capability-malformed" | "policy-capability-unknown-key" | "policy-capability-malformed-service" | "policy-capability-malformed-space" | "policy-capability-malformed-path" | "policy-capability-malformed-action" | "policy-capability-empty-actions" | "policy-capability-malformed-caveats";
declare class PolicyCapabilityError extends Error {
    readonly code: PolicyCapabilityErrorCode;
    constructor(code: PolicyCapabilityErrorCode, message: string);
}
interface PolicyCapability {
    readonly service: "tinycloud.kv" | "tinycloud.sql" | "tinycloud.vfs";
    readonly space: string;
    readonly path: string;
    readonly actions: readonly string[];
    readonly caveats?: JsonObject;
}
type JsonObject = {
    readonly [key: string]: JsonValue;
};
/**
 * Strict authoring validator for resolved Listen-adapter PolicyCapability JSON.
 * It accepts only concrete service/space/path/action/caveat forms and rejects
 * manifest-shaped permission payloads before any Policy is signed.
 */
declare function normalizePolicyCapability(input: unknown): PolicyCapability;
/**
 * Frozen-vector canonicalizer for the m1-b-01a policy-capability vectors.
 * Prefix paths are allowed here only to preserve behavioral conformance with
 * the vendored engine vectors; authoring uses normalizePolicyCapability.
 */
declare function canonicalizePolicyCapability(input: unknown): PolicyCapability;
declare function policyCapabilityDigestHex(input: unknown): string;
declare function policyCapabilityContains(authority: unknown, request: unknown): boolean;

declare const TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA: "xyz.tinycloud.exchange/transcript-bootstrap/v0";
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
    readonly resourceHint: JsonObject;
}
interface ComposeTranscriptShareBootstrapInput {
    readonly policyId: string;
    readonly policyEngineRecord: PolicyEngineRecord;
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

export { type ComposeTranscriptShareBootstrapInput, type CreatePolicyEngineRecordInput, type CreateTranscriptSharePolicyInput, JsonValue, POLICY_VERSION_V0, Policy, PolicyAuthoringError, type PolicyAuthoringErrorCode, type PolicyCapability, PolicyCapabilityError, type PolicyCapabilityErrorCode, PolicyEngineRecord, SignedObjectSigner, TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA, type TranscriptShareBootstrap, UnsignedPolicyEngineRecord, type VerifyPolicyEngineRecordOptions, W3C_VC_CREDENTIAL_VERIFIER, canonicalizePolicyCapability, composeTranscriptShareBootstrap, createAndSignRequesterPolicyEngineRecord, createAndSignTranscriptSharePolicy, createUnsignedPolicyEngineRecord, normalizePolicyCapability, policyCapabilityContains, policyCapabilityDigestHex, verifyPolicyEngineRecordForRequester };

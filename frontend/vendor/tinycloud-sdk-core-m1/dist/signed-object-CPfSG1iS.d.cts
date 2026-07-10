type SignedObjectErrorCode = "schema-invalid" | "canonicalization-mismatch" | "digest-mismatch" | "id-mismatch" | "signing-key-binding" | "signature-material-invalid" | "signature-suite-unsupported" | "signature-invalid";
declare class SignedObjectProfileError extends Error {
    readonly code: SignedObjectErrorCode;
    constructor(code: SignedObjectErrorCode, message: string);
}
declare class SignedObjectSchemaError extends SignedObjectProfileError {
    constructor(message: string);
}
declare class SignedObjectCanonicalizationError extends SignedObjectProfileError {
    constructor(message: string);
}
declare class SignedObjectDigestError extends SignedObjectProfileError {
    constructor(message: string);
}
declare class SignedObjectIdError extends SignedObjectProfileError {
    constructor(message: string);
}
declare class SigningKeyBindingError extends SignedObjectProfileError {
    constructor(message: string);
}
declare class SignatureMaterialError extends SignedObjectProfileError {
    constructor(message: string);
}
declare class UnsupportedSignatureSuiteError extends SignedObjectProfileError {
    constructor(message: string);
}
declare class SignatureVerificationError extends SignedObjectProfileError {
    constructor(message: string);
}
declare function toSignedObjectError(error: unknown): SignedObjectProfileError;

type JsonValue = null | boolean | number | string | JsonValue[] | {
    readonly [key: string]: JsonValue;
};
/**
 * RFC 8785 JSON Canonicalization Scheme encoder for the signed-object profile.
 *
 * This local encoder is intentionally stricter than JSON.stringify:
 * it rejects non-plain JSON inputs, sparse arrays, undefined/functions/symbols,
 * non-finite numbers, BigInt, dangerous prototype keys, and lone surrogates.
 * Object keys are sorted by Unicode code point before serialization.
 */
declare function jcsCanonicalize(input: unknown): string;
declare function normalizeJson(input: unknown, path?: string): JsonValue;
declare function serialize(value: JsonValue): string;

declare const POLICY_SCHEMA = "xyz.tinycloud.policy/policy/v0";
declare const POLICY_STATUS_SCHEMA = "xyz.tinycloud.policy/status/v0";
declare const POLICY_ENGINE_RECORD_SCHEMA = "xyz.tinycloud.policy/engine-record/v0";
declare const ED25519_JCS_SIGNATURE_SUITE = "eddsa-ed25519-sha256-jcs-v1";
declare const EIP191_JCS_SIGNATURE_SUITE = "eip191-secp256k1-sha256-jcs-v1";
type SignedObjectKind = "Policy" | "PolicyStatus" | "PolicyEngineRecord";
type SignatureSuite = typeof ED25519_JCS_SIGNATURE_SUITE | typeof EIP191_JCS_SIGNATURE_SUITE;
interface SignedObjectSignature {
    suite: SignatureSuite;
    signerDid: string;
    value: string;
}
type JsonObject = {
    readonly [key: string]: JsonValue;
};
interface Policy {
    readonly schema: typeof POLICY_SCHEMA;
    readonly policyId: string;
    readonly ownerDid: string;
    readonly signingKeyDid: string;
    readonly createdAt: string;
    readonly expiresAt?: string;
    readonly resource: JsonObject;
    readonly when: JsonObject;
    readonly grant: JsonObject;
    readonly disclosure?: JsonObject;
    readonly audit?: JsonObject;
    readonly signature: SignedObjectSignature;
}
type UnsignedPolicy = Omit<Policy, "policyId" | "signature">;
interface PolicyStatus {
    readonly schema: typeof POLICY_STATUS_SCHEMA;
    readonly statusId: string;
    readonly policyId: string;
    readonly ownerDid: string;
    readonly sequence: number;
    readonly disposition: "active" | "suspended" | "revoked";
    readonly effectiveAt: string;
    readonly reasonCode?: string;
    readonly signingKeyDid: string;
    readonly signature: SignedObjectSignature;
}
type UnsignedPolicyStatus = Omit<PolicyStatus, "statusId" | "signature">;
interface PolicyEngineRecord {
    readonly schema: typeof POLICY_ENGINE_RECORD_SCHEMA;
    readonly engineRecordId: string;
    readonly ownerDid: string;
    readonly endpoint: string;
    readonly audience: string;
    readonly supportedPolicyVersions: string[];
    readonly supportedEvidenceVerifiers: string[];
    readonly grantIssuerDid: string;
    readonly expiresAt: string;
    readonly signature: SignedObjectSignature;
}
type UnsignedPolicyEngineRecord = Omit<PolicyEngineRecord, "engineRecordId" | "signature">;
type SignedPolicyObject = Policy | PolicyStatus | PolicyEngineRecord;
type UnsignedPolicyObject = UnsignedPolicy | UnsignedPolicyStatus | UnsignedPolicyEngineRecord;
interface SignedObjectSigner {
    readonly suite: SignatureSuite;
    readonly signerDid: string;
    signDigest(digest: Uint8Array): Promise<Uint8Array | string> | Uint8Array | string;
}
interface SignedObjectMaterial {
    readonly kind: SignedObjectKind;
    readonly idField: string;
    readonly id: string;
    readonly domain: string;
    readonly unsigned: JsonObject;
    readonly jcs: string;
    readonly jcsBytes: Uint8Array;
    readonly digest: Uint8Array;
    readonly digestHex: string;
}
type SignedObjectVerificationResult<T extends SignedPolicyObject> = {
    readonly ok: true;
    readonly object: T;
    readonly material: SignedObjectMaterial;
} | {
    readonly ok: false;
    readonly error: SignedObjectProfileError;
};
declare function canonicalizeSignedObjectUnsigned(input: unknown): string;
declare function deriveSignedObjectMaterial(input: unknown): SignedObjectMaterial;
declare function signedObjectIdFor(input: unknown): string;
declare function createAndSignSignedObject(input: unknown, signer: SignedObjectSigner): Promise<SignedPolicyObject>;
declare function createAndSignPolicy(input: unknown, signer: SignedObjectSigner): Promise<Policy>;
declare function createAndSignPolicyStatus(input: unknown, signer: SignedObjectSigner): Promise<PolicyStatus>;
declare function createAndSignPolicyEngineRecord(input: unknown, signer: SignedObjectSigner): Promise<PolicyEngineRecord>;
declare function verifySignedObject(input: unknown): Promise<{
    object: SignedPolicyObject;
    material: SignedObjectMaterial;
}>;
declare function verifyPolicy(input: unknown): Promise<{
    object: Policy;
    material: SignedObjectMaterial;
}>;
declare function verifyPolicyStatus(input: unknown): Promise<{
    object: PolicyStatus;
    material: SignedObjectMaterial;
}>;
declare function verifyPolicyEngineRecord(input: unknown): Promise<{
    object: PolicyEngineRecord;
    material: SignedObjectMaterial;
}>;
declare function validatePolicySigned(input: unknown): Promise<SignedObjectVerificationResult<Policy>>;
declare function validatePolicyStatusSigned(input: unknown): Promise<SignedObjectVerificationResult<PolicyStatus>>;
declare function validatePolicyEngineRecordSigned(input: unknown): Promise<SignedObjectVerificationResult<PolicyEngineRecord>>;
declare function validatePolicyUnsigned(input: unknown): UnsignedPolicy;
declare function validatePolicyStatusUnsigned(input: unknown): UnsignedPolicyStatus;
declare function validatePolicyEngineRecordUnsigned(input: unknown): UnsignedPolicyEngineRecord;
declare function validatePolicySignedShape(input: unknown): Policy;
declare function validatePolicyStatusSignedShape(input: unknown): PolicyStatus;
declare function validatePolicyEngineRecordSignedShape(input: unknown): PolicyEngineRecord;

export { verifyPolicyStatus as $, canonicalizeSignedObjectUnsigned as A, createAndSignPolicy as B, createAndSignPolicyEngineRecord as C, createAndSignPolicyStatus as D, ED25519_JCS_SIGNATURE_SUITE as E, createAndSignSignedObject as F, deriveSignedObjectMaterial as G, jcsCanonicalize as H, normalizeJson as I, type JsonValue as J, serialize as K, signedObjectIdFor as L, toSignedObjectError as M, validatePolicyEngineRecordSigned as N, validatePolicyEngineRecordSignedShape as O, type PolicyEngineRecord as P, validatePolicyEngineRecordUnsigned as Q, validatePolicySigned as R, type SignedObjectSigner as S, validatePolicySignedShape as T, type UnsignedPolicyEngineRecord as U, validatePolicyStatusSigned as V, validatePolicyStatusSignedShape as W, validatePolicyStatusUnsigned as X, validatePolicyUnsigned as Y, verifyPolicy as Z, verifyPolicyEngineRecord as _, type Policy as a, verifySignedObject as a0, EIP191_JCS_SIGNATURE_SUITE as b, type JsonObject as c, POLICY_ENGINE_RECORD_SCHEMA as d, POLICY_SCHEMA as e, POLICY_STATUS_SCHEMA as f, type PolicyStatus as g, SignatureMaterialError as h, type SignatureSuite as i, SignatureVerificationError as j, SignedObjectCanonicalizationError as k, SignedObjectDigestError as l, type SignedObjectErrorCode as m, SignedObjectIdError as n, type SignedObjectKind as o, type SignedObjectMaterial as p, SignedObjectProfileError as q, SignedObjectSchemaError as r, type SignedObjectSignature as s, type SignedObjectVerificationResult as t, type SignedPolicyObject as u, SigningKeyBindingError as v, type UnsignedPolicy as w, type UnsignedPolicyObject as x, type UnsignedPolicyStatus as y, UnsupportedSignatureSuiteError as z };

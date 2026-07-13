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

export { type JsonObject as J, type PolicyCapability as P, PolicyCapabilityError as a, type JsonValue as b, type PolicyCapabilityErrorCode as c, canonicalizePolicyCapability as d, normalizePolicyCapability as e, policyCapabilityDigestHex as f, jcsCanonicalize as j, normalizeJson as n, policyCapabilityContains as p, serialize as s };

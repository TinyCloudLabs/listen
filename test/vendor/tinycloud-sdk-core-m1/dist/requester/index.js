// src/requester/index.ts
import { bytesToHex as bytesToHex3, sha256 as sha2563 } from "viem";
import { blake3 } from "@noble/hashes/blake3";
import { CID } from "multiformats/cid";
import { create as createDigest } from "multiformats/hashes/digest";
import { z } from "zod";

// src/policy/errors.ts
var SignedObjectProfileError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SignedObjectProfileError";
    this.code = code;
  }
};
var SignedObjectSchemaError = class extends SignedObjectProfileError {
  constructor(message) {
    super("schema-invalid", message);
    this.name = "SignedObjectSchemaError";
  }
};
var SignedObjectCanonicalizationError = class extends SignedObjectProfileError {
  constructor(message) {
    super("canonicalization-mismatch", message);
    this.name = "SignedObjectCanonicalizationError";
  }
};
var SignedObjectDigestError = class extends SignedObjectProfileError {
  constructor(message) {
    super("digest-mismatch", message);
    this.name = "SignedObjectDigestError";
  }
};
var SignedObjectIdError = class extends SignedObjectProfileError {
  constructor(message) {
    super("id-mismatch", message);
    this.name = "SignedObjectIdError";
  }
};
var SigningKeyBindingError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signing-key-binding", message);
    this.name = "SigningKeyBindingError";
  }
};
var SignatureMaterialError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signature-material-invalid", message);
    this.name = "SignatureMaterialError";
  }
};
var UnsupportedSignatureSuiteError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signature-suite-unsupported", message);
    this.name = "UnsupportedSignatureSuiteError";
  }
};
var SignatureVerificationError = class extends SignedObjectProfileError {
  constructor(message) {
    super("signature-invalid", message);
    this.name = "SignatureVerificationError";
  }
};

// src/policy/jcs.ts
var objectHasOwn = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
function jcsCanonicalize(input) {
  return serialize(normalizeJson(input, "$"));
}
function normalizeJson(input, path = "$") {
  if (input === null) {
    return null;
  }
  switch (typeof input) {
    case "boolean":
      return input;
    case "number":
      if (!Number.isFinite(input)) {
        throw new SignedObjectCanonicalizationError(
          `${path} must be a finite JSON number`
        );
      }
      return input;
    case "string":
      assertUnicodeScalarString(input, path);
      return input;
    case "object":
      return normalizeJsonObjectOrArray(input, path);
    case "bigint":
    case "function":
    case "symbol":
    case "undefined":
    default:
      throw new SignedObjectCanonicalizationError(
        `${path} is not a JSON value`
      );
  }
}
function serialize(value) {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number": {
      const encoded = JSON.stringify(value);
      if (encoded === void 0) {
        throw new SignedObjectCanonicalizationError(
          "number could not be serialized as JSON"
        );
      }
      return encoded;
    }
    case "string":
      return JSON.stringify(value);
    case "object":
      if (Array.isArray(value)) {
        return `[${value.map((item) => serialize(item)).join(",")}]`;
      }
      return serializeObject(value);
    default:
      throw new SignedObjectCanonicalizationError(
        `unsupported JSON value type ${typeof value}`
      );
  }
}
function normalizeJsonObjectOrArray(input, path) {
  assertNoSymbolKeys(input, path);
  if (Array.isArray(input)) {
    for (const key of Object.getOwnPropertyNames(input)) {
      if (key === "length") {
        continue;
      }
      if (!isArrayIndexKey(key, input.length)) {
        throw new SignedObjectCanonicalizationError(
          `${path}.${key} is not allowed on a JSON array`
        );
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor?.enumerable !== true) {
        throw new SignedObjectCanonicalizationError(
          `${path}[${key}] must be an enumerable JSON array item`
        );
      }
      if (!("value" in descriptor)) {
        throw new SignedObjectCanonicalizationError(
          `${path}[${key}] must be a JSON data property`
        );
      }
    }
    const output2 = [];
    for (let index = 0; index < input.length; index++) {
      if (!objectHasOwn(input, index)) {
        throw new SignedObjectCanonicalizationError(
          `${path}[${index}] must not be a sparse array hole`
        );
      }
      output2.push(normalizeJson(input[index], `${path}[${index}]`));
    }
    return output2;
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    throw new SignedObjectCanonicalizationError(
      `${path} must be a plain JSON object`
    );
  }
  const output = /* @__PURE__ */ Object.create(null);
  for (const key of Object.getOwnPropertyNames(input)) {
    assertUnicodeScalarString(key, `${path} key`);
    if (key === "__proto__" || key === "constructor") {
      throw new SignedObjectCanonicalizationError(
        `${path}.${key} is not allowed`
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor?.enumerable !== true) {
      throw new SignedObjectCanonicalizationError(
        `${path}.${key} must be an enumerable JSON object property`
      );
    }
    if (!("value" in descriptor)) {
      throw new SignedObjectCanonicalizationError(
        `${path}.${key} must be a JSON data property`
      );
    }
    const value = descriptor.value;
    output[key] = normalizeJson(value, `${path}.${key}`);
  }
  return output;
}
function assertNoSymbolKeys(input, path) {
  if (Object.getOwnPropertySymbols(input).length > 0) {
    throw new SignedObjectCanonicalizationError(
      `${path} must not have symbol properties`
    );
  }
}
function isArrayIndexKey(key, length) {
  if (!/^(0|[1-9]\d*)$/.test(key)) {
    return false;
  }
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length;
}
function serializeObject(value) {
  const keys = Object.keys(value).sort(compareCodePoints);
  const parts = keys.map((key) => `${JSON.stringify(key)}:${serialize(value[key])}`);
  return `{${parts.join(",")}}`;
}
function compareCodePoints(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const max = Math.min(left.length, right.length);
  for (let index = 0; index < max; index++) {
    const leftPoint = left[index].codePointAt(0) ?? 0;
    const rightPoint = right[index].codePointAt(0) ?? 0;
    if (leftPoint !== rightPoint) {
      return leftPoint - rightPoint;
    }
  }
  return left.length - right.length;
}
function assertUnicodeScalarString(value, path) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 55296 && code <= 56319) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 56320 || next > 57343) {
        throw new SignedObjectCanonicalizationError(
          `${path} contains a lone high surrogate`
        );
      }
      index++;
      continue;
    }
    if (code >= 56320 && code <= 57343) {
      throw new SignedObjectCanonicalizationError(
        `${path} contains a lone low surrogate`
      );
    }
  }
}

// src/policy/capability.ts
import { CAPABILITY_REGISTRY } from "@tinycloud/bootstrap";
import { bytesToHex, sha256 } from "viem";
var textEncoder = new TextEncoder();
var PolicyCapabilityError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PolicyCapabilityError";
    this.code = code;
  }
};
var objectHasOwn2 = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
var CEILING_SERVICES = /* @__PURE__ */ new Set(["tinycloud.kv", "tinycloud.sql", "tinycloud.vfs"]);
var GRANTABLE_ACTIONS = /* @__PURE__ */ new Map();
for (const entry of CAPABILITY_REGISTRY) {
  if (!CEILING_SERVICES.has(entry.service)) {
    continue;
  }
  if (entry.aliasOf !== void 0 || entry.implies !== void 0 || entry.urn.endsWith("/*")) {
    continue;
  }
  const existing = GRANTABLE_ACTIONS.get(entry.service);
  if (existing === void 0) {
    GRANTABLE_ACTIONS.set(entry.service, /* @__PURE__ */ new Set([entry.urn]));
    continue;
  }
  existing.add(entry.urn);
}
function normalizePolicyCapability(input) {
  return normalizePolicyCapabilityWithOptions(input, { requireCanonical: true });
}
function canonicalizePolicyCapability(input) {
  return normalizePolicyCapabilityWithOptions(input, { allowPrefixPaths: true });
}
function policyCapabilityContains(authority, request) {
  let auth;
  let req;
  try {
    auth = canonicalizePolicyCapability(authority);
    req = canonicalizePolicyCapability(request);
  } catch {
    return false;
  }
  if (auth.service !== req.service || auth.space !== req.space) {
    return false;
  }
  if (!pathContains(auth.path, req.path)) {
    return false;
  }
  const authActions = new Set(auth.actions);
  for (const action of req.actions) {
    if (!authActions.has(action)) {
      return false;
    }
  }
  return caveatsContain(auth.caveats, req.caveats);
}
function normalizePolicyCapabilityWithOptions(input, options) {
  const object = expectObject(input, "$");
  assertExactKeys(object, ["service", "space", "path", "actions", "caveats"], "$");
  const service = requiredString(object, "service", "$", "policy-capability-malformed-service");
  if (!CEILING_SERVICES.has(service)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-service",
      "$.service is outside the frozen permissionsCeiling vocabulary"
    );
  }
  const space = requiredString(object, "space", "$", "policy-capability-malformed-space");
  validateConcreteSpace(space);
  const canonicalSpace = space.normalize("NFC");
  if (options.requireCanonical && canonicalSpace !== space) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-space",
      "$.space must already be canonical NFC"
    );
  }
  const rawPath = requiredString(object, "path", "$", "policy-capability-malformed-path");
  validateRawPath(rawPath, options);
  const path = normalizePath(rawPath);
  if (options.requireCanonical && path !== rawPath) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-path",
      "$.path must already be canonical"
    );
  }
  validateRawPath(path, options);
  const actions = normalizeActions(
    requiredArray(object, "actions", "$", "policy-capability-malformed-action"),
    service,
    options
  );
  const output = /* @__PURE__ */ Object.create(null);
  output.service = service;
  output.space = canonicalSpace;
  output.path = path;
  output.actions = actions;
  if (hasOwn(object, "caveats")) {
    output.caveats = validateCaveats(
      requiredValue(object, "caveats", "$", "policy-capability-malformed-caveats"),
      output.service
    );
  }
  return output;
}
function expectObject(input, path) {
  try {
    const normalized = normalizeJson(input);
    if (normalized === null || typeof normalized !== "object" || Array.isArray(normalized)) {
      throw new PolicyCapabilityError("policy-capability-malformed", `${path} must be an object`);
    }
    return normalized;
  } catch (error) {
    if (error instanceof PolicyCapabilityError) {
      throw error;
    }
    throw new PolicyCapabilityError(
      "policy-capability-malformed",
      error instanceof Error ? error.message : String(error)
    );
  }
}
function assertExactKeys(object, allowed, path) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new PolicyCapabilityError(
        key === "id" || key === "scope" ? "policy-capability-malformed" : "policy-capability-unknown-key",
        `${path} has unknown field ${key}`
      );
    }
  }
}
function requiredValue(object, key, path, code) {
  if (!hasOwn(object, key)) {
    throw new PolicyCapabilityError(code, `${path}.${key} is required`);
  }
  return object[key];
}
function requiredString(object, key, path, code) {
  const value = requiredValue(object, key, path, code);
  if (typeof value !== "string" || value.length === 0) {
    throw new PolicyCapabilityError(code, `${path}.${key} must be a non-empty string`);
  }
  return value;
}
function requiredArray(object, key, path, code) {
  const value = requiredValue(object, key, path, code);
  if (!Array.isArray(value)) {
    throw new PolicyCapabilityError(code, `${path}.${key} must be an array`);
  }
  return value;
}
function validateConcreteSpace(space) {
  if (space === "*" || space.includes("*") || space.includes("?") || space.includes("/")) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-space",
      "$.space must be concrete"
    );
  }
}
function validateRawPath(path, options) {
  if (path.length === 0) {
    throw new PolicyCapabilityError("policy-capability-malformed-path", "$.path is empty");
  }
  if (!options.allowPrefixPaths && path.endsWith("/")) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-path",
      "$.path must be an exact concrete path, not a prefix"
    );
  }
  if (path.endsWith("/*") || path.includes("**")) {
    throw new PolicyCapabilityError("policy-capability-malformed-path", "$.path is a prefix form");
  }
  const segments = path.split("/");
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const isTrailingPrefixSegment = options.allowPrefixPaths && index === segments.length - 1 && segment.length === 0;
    if (segment.length === 0 && !isTrailingPrefixSegment) {
      throw new PolicyCapabilityError("policy-capability-malformed-path", "$.path has an empty segment");
    }
    if (segment === "." || segment === "..") {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-path",
        "$.path has a traversal segment"
      );
    }
    if (segment === "*" || segment === "?" || segment.includes("*") || segment.includes("?")) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-path",
        "$.path has a wildcard segment"
      );
    }
  }
}
function normalizePath(path) {
  return decodeUnreserved(path).normalize("NFC");
}
function decodeUnreserved(path) {
  return path.replace(/%[0-9A-Fa-f]{2}/g, (encoded) => {
    const char = String.fromCharCode(Number.parseInt(encoded.slice(1), 16));
    return /^[A-Za-z0-9._~-]$/.test(char) ? char : encoded.toUpperCase();
  });
}
function normalizeActions(actions, service, options) {
  const accepted = GRANTABLE_ACTIONS.get(service);
  if (accepted === void 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-service",
      "$.service is unsupported"
    );
  }
  const unique = /* @__PURE__ */ new Set();
  const rawActions = [];
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];
    if (typeof action !== "string" || action.length === 0) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-action",
        `$.actions[${index}] must be a non-empty action URN`
      );
    }
    if (!action.startsWith(`${service}/`) || action.includes("*") || !accepted.has(action)) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-action",
        `$.actions[${index}] is not a grantable action URN`
      );
    }
    rawActions.push(action);
    unique.add(action);
  }
  if (unique.size === 0) {
    throw new PolicyCapabilityError(
      "policy-capability-empty-actions",
      "$.actions must not be empty"
    );
  }
  const normalizedActions = [...unique].sort();
  if (options.requireCanonical && (rawActions.length !== normalizedActions.length || rawActions.some((action, index) => action !== normalizedActions[index]))) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-action",
      "$.actions must already be sorted, deduplicated canonical action URNs"
    );
  }
  return normalizedActions;
}
function validateCaveats(input, service) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats must be an object"
    );
  }
  if (service === "tinycloud.sql") {
    return validateSqlCaveats(input);
  }
  throw new PolicyCapabilityError(
    "policy-capability-malformed-caveats",
    "$.caveats are not defined for this service"
  );
}
function validateSqlCaveats(input) {
  assertCaveatKeys(input, ["mode", "readOnly", "statements"], "$.caveats");
  const mode = caveatString(input, "mode", "$.caveats");
  if (mode !== "constrained-statements") {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats.mode is unsupported"
    );
  }
  if (requiredCaveat(input, "readOnly", "$.caveats") !== true) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats.readOnly must be true"
    );
  }
  const statements = requiredCaveat(input, "statements", "$.caveats");
  if (!Array.isArray(statements) || statements.length === 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      "$.caveats.statements must be a non-empty array"
    );
  }
  for (let index = 0; index < statements.length; index++) {
    validateSqlStatement(statements[index], `$.caveats.statements[${index}]`);
  }
  return input;
}
function validateSqlStatement(input, path) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyCapabilityError("policy-capability-malformed-caveats", `${path} must be an object`);
  }
  const object = input;
  assertCaveatKeys(object, ["name", "sql", "fixedParams"], path);
  caveatString(object, "name", path);
  caveatString(object, "sql", path);
  const fixedParams = requiredCaveat(object, "fixedParams", path);
  if (!Array.isArray(fixedParams)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.fixedParams must be an array`
    );
  }
  for (let index = 0; index < fixedParams.length; index++) {
    validateFixedParam(fixedParams[index], `${path}.fixedParams[${index}]`);
  }
}
function validateFixedParam(input, path) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyCapabilityError("policy-capability-malformed-caveats", `${path} must be an object`);
  }
  const object = input;
  assertCaveatKeys(object, ["index", "value"], path);
  const index = requiredCaveat(object, "index", path);
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.index must be a non-negative integer`
    );
  }
  requiredCaveat(object, "value", path);
}
function assertCaveatKeys(object, allowed, path) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new PolicyCapabilityError(
        "policy-capability-malformed-caveats",
        `${path} has unknown field ${key}`
      );
    }
  }
}
function requiredCaveat(object, key, path) {
  if (!hasOwn(object, key)) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.${key} is required`
    );
  }
  return object[key];
}
function caveatString(object, key, path) {
  const value = requiredCaveat(object, key, path);
  if (typeof value !== "string" || value.length === 0) {
    throw new PolicyCapabilityError(
      "policy-capability-malformed-caveats",
      `${path}.${key} must be a non-empty string`
    );
  }
  return value;
}
function pathContains(authority, request) {
  if (authority === request) {
    return true;
  }
  return authority.endsWith("/") && request.startsWith(authority);
}
function caveatsContain(authority, request) {
  if (authority === void 0) {
    return request === void 0;
  }
  if (request === void 0) {
    return Object.keys(authority).length === 0;
  }
  if (authority.mode !== "constrained-statements" || request.mode !== "constrained-statements") {
    return false;
  }
  const authorityStatements = Array.isArray(authority.statements) ? authority.statements : [];
  const requestStatements = Array.isArray(request.statements) ? request.statements : [];
  return requestStatements.every(
    (statement) => authorityStatements.some((candidate) => jcsCanonicalize(candidate) === jcsCanonicalize(statement))
  );
}
function hasOwn(object, key) {
  return objectHasOwn2(object, key);
}

// src/policy/signed-object.ts
import { ed25519 } from "@noble/curves/ed25519";
import { bases } from "multiformats/basics";
import { bytesToHex as bytesToHex2, sha256 as sha2562, verifyMessage } from "viem";

// src/identity.ts
import { getAddress, isAddress } from "viem";
var IdentityParseError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "IdentityParseError";
  }
};
var PKH_DID_RE = /^did:pkh:eip155:(\d+):(0x[a-fA-F0-9]{40})$/;
function assertValidChainId(chainId) {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new IdentityParseError(`Invalid EIP-155 chain ID: ${chainId}`);
  }
}
function isEvmAddress(input) {
  return isAddress(input, { strict: false });
}
function canonicalizeAddress(address) {
  if (!isEvmAddress(address)) {
    throw new IdentityParseError(`Invalid EVM address: ${address}`);
  }
  return getAddress(address);
}
function parsePkhDid(did) {
  const match = did.match(PKH_DID_RE);
  if (!match) return null;
  const chainId = Number(match[1]);
  assertValidChainId(chainId);
  return {
    method: "pkh",
    namespace: "eip155",
    chainId,
    address: canonicalizeAddress(match[2])
  };
}

// src/policy/signed-object.ts
var POLICY_SCHEMA = "xyz.tinycloud.policy/policy/v0";
var POLICY_STATUS_SCHEMA = "xyz.tinycloud.policy/status/v0";
var POLICY_ENGINE_RECORD_SCHEMA = "xyz.tinycloud.policy/engine-record/v0";
var ED25519_JCS_SIGNATURE_SUITE = "eddsa-ed25519-sha256-jcs-v1";
var EIP191_JCS_SIGNATURE_SUITE = "eip191-secp256k1-sha256-jcs-v1";
var DESCRIPTORS = {
  Policy: {
    kind: "Policy",
    schema: POLICY_SCHEMA,
    idField: "policyId",
    idPrefix: "pol_",
    domain: POLICY_SCHEMA
  },
  PolicyStatus: {
    kind: "PolicyStatus",
    schema: POLICY_STATUS_SCHEMA,
    idField: "statusId",
    idPrefix: "polst_",
    domain: POLICY_STATUS_SCHEMA
  },
  PolicyEngineRecord: {
    kind: "PolicyEngineRecord",
    schema: POLICY_ENGINE_RECORD_SCHEMA,
    idField: "engineRecordId",
    idPrefix: "peng_",
    domain: POLICY_ENGINE_RECORD_SCHEMA
  }
};
var textEncoder2 = new TextEncoder();
var BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
var BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
var objectHasOwn3 = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
async function verifySignedObject(input) {
  const signed = validateSignedObjectShape(input);
  const signedJson = signed;
  const descriptor = descriptorForSchema(signed.schema);
  const signature = validateSignature(signed.signature);
  assertSigningKeyBindingForVerify(signedJson, signature);
  const unsigned = stripOwnIdAndSignature(signedJson, descriptor);
  const material = materialForUnsigned(unsigned, descriptor);
  assertIdMatches(signedJson, material, descriptor);
  if (!await verifySignature(signature, material.digest)) {
    throw new SignatureVerificationError("signature verification failed");
  }
  return { object: signed, material };
}
async function verifyPolicyEngineRecord(input) {
  const result = await verifySignedObject(input);
  return {
    object: validatePolicyEngineRecordSignedShape(result.object),
    material: result.material
  };
}
function validatePolicySignedShape(input) {
  return validatePolicyShape(input, true);
}
function validatePolicyStatusSignedShape(input) {
  return validatePolicyStatusShape(input, true);
}
function validatePolicyEngineRecordSignedShape(input) {
  return validatePolicyEngineRecordShape(input, true);
}
function validateSignedObjectShape(input) {
  const normalized = expectJsonObject(normalizeJson(input), "$");
  const schema = requiredString2(normalized, "schema", "$");
  const descriptor = descriptorForSchema(schema);
  switch (descriptor.kind) {
    case "Policy":
      return validatePolicySignedShape(normalized);
    case "PolicyStatus":
      return validatePolicyStatusSignedShape(normalized);
    case "PolicyEngineRecord":
      return validatePolicyEngineRecordSignedShape(normalized);
  }
}
function validatePolicyShape(input, signed) {
  const object = expectJsonObject(normalizeJson(input), "$");
  assertExactKeys2(
    object,
    signed ? [
      "schema",
      "policyId",
      "ownerDid",
      "signingKeyDid",
      "createdAt",
      "expiresAt",
      "resource",
      "when",
      "grant",
      "disclosure",
      "audit",
      "signature"
    ] : [
      "schema",
      "ownerDid",
      "signingKeyDid",
      "createdAt",
      "expiresAt",
      "resource",
      "when",
      "grant",
      "disclosure",
      "audit"
    ],
    "$"
  );
  expectConst(requiredString2(object, "schema", "$"), POLICY_SCHEMA, "$.schema");
  if (signed) {
    requiredString2(object, "policyId", "$");
    validateSignature(requiredValue2(object, "signature", "$"));
  }
  requiredString2(object, "ownerDid", "$");
  requiredString2(object, "signingKeyDid", "$");
  requiredDateString(object, "createdAt", "$");
  optionalDateString(object, "expiresAt", "$");
  validatePolicyResource(requiredValue2(object, "resource", "$"), "$.resource");
  validateExpression(requiredValue2(object, "when", "$"), "$.when");
  validateGrant(requiredValue2(object, "grant", "$"), "$.grant");
  if (hasOwn2(object, "disclosure")) {
    validateDisclosure(requiredValue2(object, "disclosure", "$"), "$.disclosure");
  }
  if (hasOwn2(object, "audit")) {
    validateAudit(requiredValue2(object, "audit", "$"), "$.audit");
  }
  return object;
}
function validatePolicyStatusShape(input, signed) {
  const object = expectJsonObject(normalizeJson(input), "$");
  assertExactKeys2(
    object,
    signed ? [
      "schema",
      "statusId",
      "policyId",
      "ownerDid",
      "sequence",
      "disposition",
      "effectiveAt",
      "reasonCode",
      "signingKeyDid",
      "signature"
    ] : [
      "schema",
      "policyId",
      "ownerDid",
      "sequence",
      "disposition",
      "effectiveAt",
      "reasonCode",
      "signingKeyDid"
    ],
    "$"
  );
  expectConst(requiredString2(object, "schema", "$"), POLICY_STATUS_SCHEMA, "$.schema");
  if (signed) {
    requiredString2(object, "statusId", "$");
    validateSignature(requiredValue2(object, "signature", "$"));
  }
  requiredString2(object, "policyId", "$");
  requiredString2(object, "ownerDid", "$");
  requiredInteger(object, "sequence", "$", 0);
  expectOneOf(requiredString2(object, "disposition", "$"), [
    "active",
    "suspended",
    "revoked"
  ], "$.disposition");
  requiredDateString(object, "effectiveAt", "$");
  optionalString(object, "reasonCode", "$");
  requiredString2(object, "signingKeyDid", "$");
  return object;
}
function validatePolicyEngineRecordShape(input, signed) {
  const object = expectJsonObject(normalizeJson(input), "$");
  assertExactKeys2(
    object,
    signed ? [
      "schema",
      "engineRecordId",
      "ownerDid",
      "endpoint",
      "audience",
      "supportedPolicyVersions",
      "supportedEvidenceVerifiers",
      "grantIssuerDid",
      "expiresAt",
      "signature"
    ] : [
      "schema",
      "ownerDid",
      "endpoint",
      "audience",
      "supportedPolicyVersions",
      "supportedEvidenceVerifiers",
      "grantIssuerDid",
      "expiresAt"
    ],
    "$"
  );
  expectConst(
    requiredString2(object, "schema", "$"),
    POLICY_ENGINE_RECORD_SCHEMA,
    "$.schema"
  );
  if (signed) {
    requiredString2(object, "engineRecordId", "$");
    validateSignature(requiredValue2(object, "signature", "$"));
  }
  requiredString2(object, "ownerDid", "$");
  requiredString2(object, "endpoint", "$");
  requiredString2(object, "audience", "$");
  requiredStringArray(
    object,
    "supportedPolicyVersions",
    "$",
    (value, path) => expectConst(value, "v0", path)
  );
  requiredStringArray(object, "supportedEvidenceVerifiers", "$");
  requiredString2(object, "grantIssuerDid", "$");
  requiredDateString(object, "expiresAt", "$");
  return object;
}
function validateSignature(input) {
  const object = expectJsonObject(input, "$.signature");
  assertExactKeys2(object, ["suite", "signerDid", "value"], "$.signature");
  const suite = requiredString2(object, "suite", "$.signature");
  assertSupportedSignatureSuite(suite);
  const signerDid = requiredString2(object, "signerDid", "$.signature");
  const value = requiredString2(object, "value", "$.signature");
  decodeSignatureValue(value, suite);
  return { suite, signerDid, value };
}
function validatePolicyResource(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["resourceType", "resourceId", "permissionsCeiling"], path);
  requiredString2(object, "resourceType", path);
  requiredString2(object, "resourceId", path);
  const ceiling = requiredArray2(object, "permissionsCeiling", path, 1);
  for (let index = 0; index < ceiling.length; index++) {
    validatePolicyCapability(ceiling[index], `${path}.permissionsCeiling[${index}]`);
  }
}
function validatePolicyCapability(input, path) {
  const object = expectJsonObject(input, path);
  try {
    const canonical = canonicalizePolicyCapability(object);
    if (jcsCanonicalize(object) !== jcsCanonicalize(canonical)) {
      throw new SignedObjectSchemaError(`${path} must be canonical PolicyCapability JSON`);
    }
  } catch (error) {
    if (error instanceof SignedObjectSchemaError) {
      throw error;
    }
    throw new SignedObjectSchemaError(
      error instanceof Error ? error.message : String(error)
    );
  }
}
function validateExpression(input, path) {
  const object = expectJsonObject(input, path);
  const keys = Object.keys(object);
  if (keys.length !== 1) {
    throw new SignedObjectSchemaError(`${path} must have exactly one expression key`);
  }
  const key = keys[0];
  if (key === "allOf" || key === "anyOf") {
    const values = requiredArray2(object, key, path, 1);
    for (let index = 0; index < values.length; index++) {
      validateExpression(values[index], `${path}.${key}[${index}]`);
    }
    return;
  }
  if (key === "subject") {
    const subject = expectJsonObject(requiredValue2(object, "subject", path), `${path}.subject`);
    assertExactKeys2(subject, ["did"], `${path}.subject`);
    requiredString2(subject, "did", `${path}.subject`);
    return;
  }
  if (key === "evidence") {
    validateEvidenceRequirement(requiredValue2(object, "evidence", path), `${path}.evidence`);
    return;
  }
  throw new SignedObjectSchemaError(`${path} has unknown expression key ${key}`);
}
function validateEvidenceRequirement(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(
    object,
    ["requirementId", "verifier", "requirements", "authority", "freshness"],
    path
  );
  requiredString2(object, "requirementId", path);
  requiredString2(object, "verifier", path);
  requiredValue2(object, "requirements", path);
  if (hasOwn2(object, "authority")) {
    const authority = expectJsonObject(requiredValue2(object, "authority", path), `${path}.authority`);
    assertExactKeys2(
      authority,
      ["profile", "acceptedIssuers", "allowOwnerAuthorizedIssuer"],
      `${path}.authority`
    );
    optionalString(authority, "profile", `${path}.authority`);
    if (hasOwn2(authority, "acceptedIssuers")) {
      requiredStringArray(authority, "acceptedIssuers", `${path}.authority`);
    }
    optionalBoolean(authority, "allowOwnerAuthorizedIssuer", `${path}.authority`);
  }
  if (hasOwn2(object, "freshness")) {
    const freshness = expectJsonObject(requiredValue2(object, "freshness", path), `${path}.freshness`);
    assertExactKeys2(freshness, ["maxStatusAgeSeconds"], `${path}.freshness`);
    requiredInteger(freshness, "maxStatusAgeSeconds", `${path}.freshness`, 0);
  }
}
function validateGrant(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["output", "maxTtlSeconds", "delegationMode", "revocation"], path);
  expectConst(requiredString2(object, "output", path), "portable-delegation", `${path}.output`);
  requiredInteger(object, "maxTtlSeconds", path, 1);
  expectOneOf(requiredString2(object, "delegationMode", path), [
    "terminal",
    "attenuable"
  ], `${path}.delegationMode`);
  expectOneOf(requiredString2(object, "revocation", path), [
    "refresh_only",
    "active_cutoff"
  ], `${path}.revocation`);
}
function validateDisclosure(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["denial"], path);
  expectOneOf(requiredString2(object, "denial", path), ["none", "code", "debug"], `${path}.denial`);
}
function validateAudit(input, path) {
  const object = expectJsonObject(input, path);
  assertExactKeys2(object, ["issuance"], path);
  expectOneOf(requiredString2(object, "issuance", path), ["off", "security", "full"], `${path}.issuance`);
}
function materialForUnsigned(unsigned, descriptor) {
  const jcs = jcsCanonicalize(unsigned);
  const jcsBytes = textEncoder2.encode(jcs);
  const digest = sha256Bytes(concatBytes(textEncoder2.encode(`${descriptor.domain}\0`), jcsBytes));
  const id = `${descriptor.idPrefix}${base32LowerNoPad(digest)}`;
  return {
    kind: descriptor.kind,
    idField: descriptor.idField,
    id,
    domain: descriptor.domain,
    unsigned,
    jcs,
    jcsBytes,
    digest,
    digestHex: bytesToHex2(digest).slice(2)
  };
}
function assertIdMatches(signed, material, descriptor) {
  const actual = requiredString2(signed, descriptor.idField, "$");
  if (actual === material.id) {
    return;
  }
  if (new RegExp(`^${descriptor.idPrefix}[a-z2-7]{52}$`).test(actual)) {
    throw new SignedObjectDigestError(
      `${descriptor.idField} was not derived from the signed object digest`
    );
  }
  throw new SignedObjectIdError(`${descriptor.idField} does not match ${descriptor.idPrefix}`);
}
function assertSigningKeyBindingForVerify(signed, signature) {
  if (!hasOwn2(signed, "signingKeyDid")) {
    return;
  }
  const signingKeyDid = requiredString2(signed, "signingKeyDid", "$");
  if (signature.signerDid !== signingKeyDid) {
    throw new SigningKeyBindingError(
      `signature signerDid ${signature.signerDid} does not match signingKeyDid ${signingKeyDid}`
    );
  }
}
async function verifySignature(signature, digest) {
  if (signature.suite === ED25519_JCS_SIGNATURE_SUITE) {
    const publicKey = ed25519PublicKeyFromDidKey(signature.signerDid);
    const signatureBytes = decodeSignatureValue(signature.value, signature.suite);
    try {
      return ed25519.verify(signatureBytes, digest, publicKey);
    } catch {
      throw new SignatureVerificationError("Ed25519 signature verification failed");
    }
  }
  if (signature.suite === EIP191_JCS_SIGNATURE_SUITE) {
    const pkh = parseDidPkh(signature.signerDid);
    const signatureBytes = decodeSignatureValue(signature.value, signature.suite);
    try {
      return verifyMessage({
        address: pkh.address,
        message: { raw: digest },
        signature: bytesToHex2(signatureBytes)
      });
    } catch {
      throw new SignatureVerificationError("EIP-191 signature verification failed");
    }
  }
  throw new UnsupportedSignatureSuiteError(`unsupported signature suite: ${signature.suite}`);
}
function ed25519PublicKeyFromDidKey(did) {
  if (!did.startsWith("did:key:")) {
    throw new SignatureMaterialError("Ed25519 signerDid must be did:key");
  }
  const identifier = did.slice("did:key:".length);
  if (!identifier.startsWith("z")) {
    throw new SignatureMaterialError("did:key must use base58btc multibase");
  }
  let bytes;
  try {
    bytes = bases.base58btc.decode(identifier);
  } catch {
    throw new SignatureMaterialError("did:key signerDid is undecodable");
  }
  if (bytes.length === 34 && bytes[0] === 237 && bytes[1] === 1) {
    return bytes.slice(2);
  }
  throw new SignatureMaterialError("did:key signerDid is not an Ed25519 key");
}
function parseDidPkh(did) {
  let parsed;
  try {
    parsed = parsePkhDid(did);
  } catch {
    throw new SignatureMaterialError("did:pkh signerDid is undecodable");
  }
  if (!parsed) {
    throw new SignatureMaterialError("EIP-191 signerDid must be did:pkh");
  }
  return { address: parsed.address };
}
function decodeSignatureValue(value, suite) {
  if (value.length === 0 || !BASE64URL_RE.test(value) || value.includes("=")) {
    throw new SignatureMaterialError("signature value must be base64url without padding");
  }
  const bytes = base64UrlDecode(value);
  if (suite === ED25519_JCS_SIGNATURE_SUITE && bytes.length !== 64) {
    throw new SignatureMaterialError("Ed25519 signature must be 64 bytes");
  }
  if (suite === EIP191_JCS_SIGNATURE_SUITE) {
    if (bytes.length !== 65) {
      throw new SignatureMaterialError("EIP-191 signature must be 65 bytes");
    }
    const v = bytes[64];
    if (v !== 27 && v !== 28) {
      throw new SignatureMaterialError("EIP-191 signature recovery id must be 27 or 28");
    }
  }
  return bytes;
}
function stripOwnIdAndSignature(object, descriptor) {
  const output = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of Object.entries(object)) {
    if (key === descriptor.idField || key === "signature") {
      continue;
    }
    output[key] = value;
  }
  return output;
}
function descriptorForSchema(schema) {
  if (schema === POLICY_SCHEMA) return DESCRIPTORS.Policy;
  if (schema === POLICY_STATUS_SCHEMA) return DESCRIPTORS.PolicyStatus;
  if (schema === POLICY_ENGINE_RECORD_SCHEMA) return DESCRIPTORS.PolicyEngineRecord;
  throw new SignedObjectSchemaError(`unsupported signed-object schema: ${schema}`);
}
function expectJsonObject(input, path) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new SignedObjectSchemaError(`${path} must be an object`);
  }
  return input;
}
function assertExactKeys2(object, allowed, path) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new SignedObjectSchemaError(`${path} has unknown field ${key}`);
    }
  }
}
function requiredValue2(object, key, path) {
  if (!hasOwn2(object, key)) {
    throw new SignedObjectSchemaError(`${path}.${key} is required`);
  }
  return object[key];
}
function requiredString2(object, key, path) {
  return requireStringType(requiredValue2(object, key, path), `${path}.${key}`);
}
function optionalString(object, key, path) {
  if (!hasOwn2(object, key)) {
    return;
  }
  requireStringType(requiredValue2(object, key, path), `${path}.${key}`);
}
function requireStringType(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    throw new SignedObjectSchemaError(`${path} must be a non-empty string`);
  }
  return value;
}
function optionalBoolean(object, key, path) {
  if (!hasOwn2(object, key)) {
    return;
  }
  if (typeof requiredValue2(object, key, path) !== "boolean") {
    throw new SignedObjectSchemaError(`${path}.${key} must be a boolean`);
  }
}
function requiredInteger(object, key, path, minimum) {
  const value = requiredValue2(object, key, path);
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new SignedObjectSchemaError(
      `${path}.${key} must be an integer >= ${minimum}`
    );
  }
  return value;
}
function requiredArray2(object, key, path, minimum) {
  const value = requiredValue2(object, key, path);
  if (!Array.isArray(value) || value.length < minimum) {
    throw new SignedObjectSchemaError(
      `${path}.${key} must be an array with at least ${minimum} item(s)`
    );
  }
  return value;
}
function requiredStringArray(object, key, path, check) {
  const values = requiredArray2(object, key, path, 0);
  for (let index = 0; index < values.length; index++) {
    const itemPath = `${path}.${key}[${index}]`;
    const value = requireStringType(values[index], itemPath);
    check?.(value, itemPath);
  }
}
function requiredDateString(object, key, path) {
  assertRfc3339(requiredString2(object, key, path), `${path}.${key}`);
}
function optionalDateString(object, key, path) {
  if (!hasOwn2(object, key)) {
    return;
  }
  assertRfc3339(requiredString2(object, key, path), `${path}.${key}`);
}
function assertRfc3339(value, path) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
  );
  if (!match) {
    throw new SignedObjectSchemaError(`${path} must be strict RFC 3339`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new SignedObjectSchemaError(`${path} must be a parseable RFC 3339 timestamp`);
  }
  const canonical = new Date(parsed).toISOString().replace(".000Z", "Z");
  if (canonical !== value) {
    throw new SignedObjectSchemaError(`${path} must be a normalizable RFC 3339 timestamp`);
  }
}
function expectConst(actual, expected, path) {
  if (actual !== expected) {
    throw new SignedObjectSchemaError(`${path} must be ${expected}`);
  }
  return expected;
}
function expectOneOf(actual, allowed, path) {
  for (const value of allowed) {
    if (actual === value) {
      return value;
    }
  }
  throw new SignedObjectSchemaError(`${path} has unsupported value ${actual}`);
}
function hasOwn2(object, key) {
  return objectHasOwn3(object, key);
}
function assertSupportedSignatureSuite(suite) {
  if (suite !== ED25519_JCS_SIGNATURE_SUITE && suite !== EIP191_JCS_SIGNATURE_SUITE) {
    throw new UnsupportedSignatureSuiteError(`unsupported signature suite: ${suite}`);
  }
}
function sha256Bytes(bytes) {
  return sha2562(bytes, "bytes");
}
function concatBytes(left, right) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}
function base32LowerNoPad(bytes) {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = buffer << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[buffer >> bits & 31];
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[buffer << 5 - bits & 31];
  }
  return output;
}
function base64UrlEncode(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triplet = a << 16 | (b ?? 0) << 8 | (c ?? 0);
    output += alphabet[triplet >> 18 & 63];
    output += alphabet[triplet >> 12 & 63];
    if (index + 1 < bytes.length) {
      output += alphabet[triplet >> 6 & 63];
    }
    if (index + 2 < bytes.length) {
      output += alphabet[triplet & 63];
    }
  }
  return output;
}
function base64UrlDecode(value) {
  if (value.length % 4 === 1) {
    throw new SignatureMaterialError("signature value is not canonical base64url");
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) {
      throw new SignatureMaterialError("signature value is not base64url");
    }
    buffer = buffer << 6 | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  const decoded = Uint8Array.from(bytes);
  if (base64UrlEncode(decoded) !== value) {
    throw new SignatureMaterialError("signature value is not canonical base64url");
  }
  return decoded;
}

// src/policy/authoring.ts
var TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA = "xyz.tinycloud.exchange/transcript-bootstrap/v0";
var OWNER_NODE_ENDPOINT_SCHEMA = "xyz.tinycloud.exchange/owner-node-endpoint/v1";
var POLICY_VERSION_V0 = "v0";
var W3C_VC_CREDENTIAL_VERIFIER = "w3c.vc/credential/v1";
var PolicyAuthoringError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PolicyAuthoringError";
    this.code = code;
  }
};
async function verifyPolicyEngineRecordForRequester(options) {
  const normalized = expectObject2(options, "$", "policy-authoring-malformed");
  assertExactKeys3(
    normalized,
    [
      "signedRecord",
      "ownerDid",
      "audience",
      "grantIssuerDid",
      "now",
      "requiredPolicyVersion",
      "requiredEvidenceVerifier"
    ],
    "$"
  );
  if (!hasOwn3(normalized, "signedRecord")) {
    throw new PolicyAuthoringError(
      "policy-engine-record-absent",
      "$.signedRecord must be present"
    );
  }
  const signedRecord = normalized["signedRecord"];
  if (signedRecord === null || typeof signedRecord !== "object" || Array.isArray(signedRecord)) {
    throw new PolicyAuthoringError(
      "policy-engine-record-absent",
      "$.signedRecord must be present"
    );
  }
  const recordObject = signedRecord;
  const expiresAt = fieldString(recordObject, "expiresAt", "$.signedRecord", "policy-engine-record-date-invalid");
  const now = fieldString(normalized, "now", "$", "policy-engine-record-date-invalid");
  const expiresMs = parseStrictRfc3339(expiresAt, "$.signedRecord.expiresAt");
  const nowMs = parseStrictRfc3339(now, "$.now");
  if (expiresMs <= nowMs) {
    throw new PolicyAuthoringError(
      "policy-engine-record-expired",
      "$.signedRecord.expiresAt is expired"
    );
  }
  let verified;
  try {
    verified = (await verifyPolicyEngineRecord(recordObject)).object;
  } catch (error) {
    throw new PolicyAuthoringError(
      "policy-engine-record-signature-invalid",
      error instanceof Error ? error.message : String(error)
    );
  }
  const expectedOwnerDid = requiredString3(normalized, "ownerDid", "$");
  if (verified.ownerDid !== expectedOwnerDid) {
    throw new PolicyAuthoringError(
      "policy-engine-record-owner-mismatch",
      "$.signedRecord.ownerDid does not match"
    );
  }
  const expectedAudience = requiredString3(normalized, "audience", "$");
  if (verified.audience !== expectedAudience) {
    throw new PolicyAuthoringError(
      "policy-engine-record-audience-mismatch",
      "$.signedRecord.audience does not match"
    );
  }
  const expectedGrantIssuerDid = requiredString3(normalized, "grantIssuerDid", "$");
  if (verified.grantIssuerDid !== expectedGrantIssuerDid) {
    throw new PolicyAuthoringError(
      "policy-engine-record-grant-issuer-mismatch",
      "$.signedRecord.grantIssuerDid does not match"
    );
  }
  const requiredPolicyVersion = hasOwn3(normalized, "requiredPolicyVersion") ? requiredString3(normalized, "requiredPolicyVersion", "$") : POLICY_VERSION_V0;
  if (!verified.supportedPolicyVersions.includes(requiredPolicyVersion)) {
    throw new PolicyAuthoringError(
      "policy-engine-record-policy-version-unsupported",
      "$.signedRecord.supportedPolicyVersions does not include the required version"
    );
  }
  const requiredEvidenceVerifier = hasOwn3(normalized, "requiredEvidenceVerifier") ? requiredString3(normalized, "requiredEvidenceVerifier", "$") : W3C_VC_CREDENTIAL_VERIFIER;
  if (!verified.supportedEvidenceVerifiers.includes(requiredEvidenceVerifier)) {
    throw new PolicyAuthoringError(
      "policy-engine-record-evidence-verifier-unsupported",
      "$.signedRecord.supportedEvidenceVerifiers does not include the required verifier"
    );
  }
  return verified;
}
function expectObject2(input, path, code) {
  try {
    const normalized = normalizeJson(input);
    if (normalized === null || typeof normalized !== "object" || Array.isArray(normalized)) {
      throw new PolicyAuthoringError(code, `${path} must be an object`);
    }
    return normalized;
  } catch (error) {
    if (error instanceof PolicyAuthoringError) {
      throw error;
    }
    throw new PolicyAuthoringError(
      code,
      error instanceof Error ? error.message : String(error)
    );
  }
}
function assertExactKeys3(object, allowed, path) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(object)) {
    if (!allowedSet.has(key)) {
      throw new PolicyAuthoringError("policy-authoring-unknown-key", `${path} has unknown field ${key}`);
    }
  }
}
function requiredValue3(object, key, path) {
  if (!hasOwn3(object, key)) {
    throw new PolicyAuthoringError("policy-authoring-malformed", `${path}.${key} is required`);
  }
  return object[key];
}
function requiredString3(object, key, path) {
  const value = requiredValue3(object, key, path);
  if (typeof value !== "string" || value.length === 0) {
    throw new PolicyAuthoringError("policy-authoring-malformed", `${path}.${key} must be a non-empty string`);
  }
  return value;
}
function fieldString(object, key, path, code) {
  if (!hasOwn3(object, key)) {
    throw new PolicyAuthoringError(code, `${path}.${key} is required`);
  }
  const value = object[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new PolicyAuthoringError(code, `${path}.${key} must be a non-empty string`);
  }
  return value;
}
function parseStrictRfc3339(value, path) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?Z$/
  );
  if (!match) {
    throw new PolicyAuthoringError("policy-engine-record-date-invalid", `${path} must be strict RFC 3339`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new PolicyAuthoringError(
      "policy-engine-record-date-invalid",
      `${path} must be parseable`
    );
  }
  const canonical = new Date(parsed).toISOString().replace(".000Z", "Z");
  if (canonical !== value) {
    throw new PolicyAuthoringError(
      "policy-engine-record-date-invalid",
      `${path} must be normalizable`
    );
  }
  return parsed;
}
var objectHasOwn4 = Object.hasOwn ?? Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);
function hasOwn3(object, key) {
  return objectHasOwn4(object, key);
}

// src/requester/index.ts
var REQUESTER_NEAR_EXPIRY_SECONDS = 30;
var REQUESTER_ENGINE_RETRY_ATTEMPTS = 3;
var REQUESTER_ENGINE_RETRY_MAX_DELAY_MS = 250;
var POLICY_ENGINE_CHALLENGE_REQUEST_SCHEMA = "xyz.tinycloud.policy-engine/challenge-request/v0";
var POLICY_ENGINE_CHALLENGE_RESPONSE_SCHEMA = "xyz.tinycloud.policy/challenge/v0";
var POLICY_ENGINE_RESOLVE_REQUEST_SCHEMA = "xyz.tinycloud.policy/presentation/v0";
var POLICY_ENGINE_DENIAL_SCHEMA = "xyz.tinycloud.policy-engine/denial/v0";
var HOLDER_KEY_BINDING_PRESENTATION_SCHEMA = "xyz.tinycloud.policy/presentation/v0";
var PORTABLE_DELEGATION_SCHEMA = "xyz.tinycloud.policy/portable-delegation/v0";
var POLICY_ENGINE_GRANT_PRESENTATION_DENIAL_CODES = [
  "schema-invalid",
  "challenge-not-found",
  "challenge-expired",
  "challenge-nonce-consumed",
  "presentation-expired",
  "presentation-audience-mismatch",
  "presentation-evidence-missing",
  "digest-mismatch",
  "evidence-requirement-unknown",
  "evidence-requirement-duplicate",
  "holder-signature-invalid",
  "holder-signature-signer-mismatch",
  "id-mismatch",
  "requested-capabilities-exceeded",
  "requested-capabilities-hash-mismatch",
  "evidence-authority-missing",
  "evidence-credential-invalid",
  "evidence-domain-invalid",
  "evidence-domain-missing",
  "evidence-freshness-expired",
  "evidence-freshness-unestablishable",
  "evidence-issuer-missing",
  "evidence-issuer-untrusted",
  "evidence-presentation-invalid",
  "evidence-requirements-invalid",
  "evidence-verifier-unsupported",
  "enrollment-binding-mismatch",
  "enrollment-expired",
  "enrollment-not-yet-valid",
  "enrollment-out-of-scope",
  "enrollment-revoked",
  "enrollment-revoked-irreversible",
  "enrollment-status-rollback",
  "signature-invalid",
  "signer-not-authorized",
  "audience-mismatch",
  "capability-not-contained",
  "evidence-invalid",
  "evidence-missing",
  "evidence-stale",
  "evidence-subject-mismatch",
  "evidence-untrusted",
  "grant-ttl-exceeds-policy",
  "holder-did-mismatch",
  "holder-key-not-permitted",
  "holder-signature-invalid",
  "owner-mismatch",
  "policy-expired",
  "policy-inactive",
  "policy-not-found",
  "policy-not-satisfied",
  "policy-revoked",
  "policy-status-rollback",
  "rate-limited"
];
var TranscriptRequesterError = class extends Error {
  constructor(code, message, state = "invalid", denialCode, status) {
    super(message);
    this.name = "TranscriptRequesterError";
    this.code = code;
    this.state = state;
    this.denialCode = denialCode;
    this.status = status;
  }
};
var JsonValueSchema = z.lazy(
  () => z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema)
  ])
);
var Rfc3339Schema = z.string().refine((value) => parseStrictRfc33392(value) !== void 0, {
  message: "must be strict RFC 3339 date-time with timezone"
});
var SignedRecordSchema = z.object({
  schema: z.string(),
  engineRecordId: z.string(),
  ownerDid: z.string(),
  endpoint: z.string(),
  audience: z.string(),
  supportedPolicyVersions: z.array(z.string()),
  supportedEvidenceVerifiers: z.array(z.string()),
  grantIssuerDid: z.string(),
  expiresAt: Rfc3339Schema,
  signature: z.object({
    suite: z.string(),
    signerDid: z.string(),
    value: z.string()
  }).strict()
}).strict();
var PolicyEngineSchema = z.object({
  endpoint: z.string().url(),
  audience: z.string(),
  supportedEvidenceVerifiers: z.tuple([z.literal(W3C_VC_CREDENTIAL_VERIFIER)]),
  signedRecord: SignedRecordSchema
}).strict();
var OwnerNodeSchema = z.object({
  schema: z.literal(OWNER_NODE_ENDPOINT_SCHEMA),
  endpoint: z.string().url(),
  spaceId: z.string().min(1)
}).strict();
var ResourceHintSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  requestedCapabilities: z.array(JsonValueSchema).min(1)
}).strict();
var BootstrapSchema = z.object({
  schema: z.literal(TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA),
  policyId: z.string(),
  policyEngine: PolicyEngineSchema,
  ownerNode: OwnerNodeSchema,
  resourceHint: ResourceHintSchema
}).strict();
var SignatureSchema = z.object({
  suite: z.string(),
  signerDid: z.string(),
  value: z.string()
}).strict();
var ChallengeSchema = z.object({
  schema: z.literal(POLICY_ENGINE_CHALLENGE_RESPONSE_SCHEMA),
  challengeId: z.string(),
  policyId: z.string(),
  audience: z.string(),
  nonce: z.string().min(16),
  challengeExpiresAt: Rfc3339Schema,
  acceptedSuites: z.array(z.string()).min(1),
  requestedCapabilitiesTemplate: z.array(JsonValueSchema).optional(),
  signature: SignatureSchema
}).strict();
var ChallengeResponseSchema = z.object({ challenge: ChallengeSchema }).strict();
var DenialSchema = z.object({
  schema: z.literal(POLICY_ENGINE_DENIAL_SCHEMA),
  code: z.enum(POLICY_ENGINE_GRANT_PRESENTATION_DENIAL_CODES),
  message: z.string().optional()
}).strict();
var ErrorEnvelopeDenialSchema = z.object({
  error: z.object({
    code: z.enum(POLICY_ENGINE_GRANT_PRESENTATION_DENIAL_CODES),
    message: z.string().optional()
  }).strict()
}).strict();
var CapabilitySchema = z.object({
  service: z.enum(["tinycloud.kv", "tinycloud.sql", "tinycloud.vfs"]),
  space: z.string(),
  path: z.string(),
  actions: z.array(z.string()).min(1),
  caveats: JsonValueSchema.optional()
}).strict();
var WireDelegationSchema = z.object({
  delegationId: z.string(),
  issuerDid: z.string(),
  holderDid: z.string(),
  policyId: z.string(),
  capabilities: z.array(CapabilitySchema).min(1).optional(),
  issuanceId: z.string().optional(),
  capabilityHashHex: z.string().optional(),
  revocationMode: z.literal("refresh_only").optional(),
  issuedAt: Rfc3339Schema,
  expiresAt: Rfc3339Schema,
  terminal: z.boolean(),
  encoded: z.string()
}).strict();
var ResolveResponseSchema = z.object({ delegation: WireDelegationSchema }).strict();
var DelegateReceiptSchema = z.object({ cid: z.string().min(1), activated: z.array(z.string()), skipped: z.array(z.string()) }).strict();
var SqlReadResponseSchema = z.object({ rows: z.array(JsonValueSchema) }).strict();
var KvReadResponseSchema = z.object({ value: JsonValueSchema }).strict();
var LISTEN_SQL_STATEMENT_CATALOG = [
  {
    name: "listen.getConversation",
    sql: "SELECT id, title, source, source_id, source_url, started_at, ended_at, duration_secs, summary, metadata, transcript_json, transcript_text, created_at, updated_at FROM conversation WHERE id = ?",
    fixedParams: [{ index: 0, value: "{conversationId}" }]
  },
  {
    name: "listen.listParticipants",
    sql: "SELECT id, name, email, speaker_label FROM participant WHERE conversation_id = ? ORDER BY COALESCE(speaker_label, name), id",
    fixedParams: [{ index: 0, value: "{conversationId}" }]
  }
];
var LISTEN_SQL_STATEMENT_BY_NAME = new Map(
  LISTEN_SQL_STATEMENT_CATALOG.map((statement) => [statement.name, statement])
);
var TranscriptRequester = class _TranscriptRequester {
  constructor(bootstrap, requestedCapabilities, requestedCapabilitiesHash2, ownerNodeAddresses, options) {
    this.usedChallengeNonces = /* @__PURE__ */ new Set();
    this.accessEnded = false;
    this.bootstrap = bootstrap;
    this.requestedCapabilities = requestedCapabilities;
    this.requestedCapabilitiesHash = requestedCapabilitiesHash2;
    this.requesterDid = options.requesterDid;
    this.ownerDid = options.ownerDid;
    this.audience = options.audience;
    this.grantIssuerDid = options.grantIssuerDid;
    this.transport = options.transport;
    this.signingCapability = options.signingCapability;
    this.invocationCapability = options.invocationCapability;
    this.ownerNodeAddresses = ownerNodeAddresses;
    this.eligibleSubjectDid = options.eligibleSubjectDid ?? options.signingCapability?.eligibleSubjectDid ?? options.requesterDid;
    this.holderBinding = options.holderBinding ?? options.signingCapability?.holderBinding ?? {
      type: "enrolled-agent",
      enrollment: {
        schema: "xyz.tinycloud.policy/holder-enrollment/v0",
        holderDid: options.requesterDid
      }
    };
    this.evidence = options.evidence ?? options.signingCapability?.evidence;
    this.presentationTtlSeconds = Math.min(Math.max(options.presentationTtlSeconds ?? 60, 1), 300);
    this.now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.random = options.random ?? Math.random;
    this.engineRetryAttempts = options.engineRetryAttempts ?? REQUESTER_ENGINE_RETRY_ATTEMPTS;
  }
  static async create(options) {
    const bootstrap = parseBootstrap(options.bootstrap);
    const ownerNodeAddresses = await validateAndResolveOwnerNode(bootstrap.ownerNode.endpoint, options.transport);
    const record = await verifyRecordBeforeEgress(bootstrap, options);
    if (record.endpoint !== bootstrap.policyEngine.endpoint) {
      throw new TranscriptRequesterError(
        "requester-engine-record-endpoint-mismatch",
        "policy engine record endpoint does not match bootstrap endpoint",
        "bootstrap-invalid"
      );
    }
    if (record.audience !== bootstrap.policyEngine.audience) {
      throw new TranscriptRequesterError(
        "requester-engine-record-audience-mismatch",
        "policy engine record audience does not match bootstrap audience",
        "bootstrap-invalid"
      );
    }
    const requestedCapabilities = bootstrap.resourceHint.requestedCapabilities.map(
      (capability, index) => parsePolicyCapability(capability, `$.resourceHint.requestedCapabilities[${index}]`)
    );
    return new _TranscriptRequester(
      bootstrap,
      requestedCapabilities,
      requestedCapabilitiesHash(requestedCapabilities),
      ownerNodeAddresses,
      options
    );
  }
  get accessState() {
    if (this.accessEnded) {
      return "access-ended";
    }
    if (this.importedDelegation === void 0) {
      return "needs-renewal";
    }
    if (this.requiresRenewal(this.importedDelegation)) {
      return "needs-renewal";
    }
    return "active";
  }
  async readSql(statementName) {
    try {
      const statement = listenSqlStatementFromCatalog(statementName);
      const delegation = await this.ensureFreshDelegation();
      const requested = this.sqlAccessCapabilityForDelegation(delegation, statement);
      this.assertContainedByDelegation(delegation, requested);
      const response = await this.nativeInvoke(
        "sql",
        requested.path,
        "tinycloud.sql/read",
        { action: "execute_statement", name: statement.name, params: statement.fixedParams.map((item) => item.value) }
      );
      return parseNodeDataResponse(response, SqlReadResponseSchema, "SQL read");
    } catch (error) {
      this.recordAccessEnded(error);
      throw error;
    }
  }
  async readKv(path) {
    try {
      const delegation = await this.ensureFreshDelegation();
      const grantedKv = delegation.capabilities.find(
        (capability) => capability.service === "tinycloud.kv" && capability.path === path && capability.actions.includes("tinycloud.kv/get")
      );
      const requested = parsePolicyCapability(
        {
          service: "tinycloud.kv",
          space: grantedKv?.space ?? "applications",
          path,
          actions: ["tinycloud.kv/get"]
        },
        "$.kvRead"
      );
      this.assertContainedByDelegation(delegation, requested);
      const response = await this.nativeInvoke("kv", path, "tinycloud.kv/get");
      return parseNodeDataResponse(response, KvReadResponseSchema, "KV read");
    } catch (error) {
      this.recordAccessEnded(error);
      throw error;
    }
  }
  async nativeInvoke(service, path, action, body) {
    const capability = this.invocationCapability;
    if (capability === void 0) {
      throw new TranscriptRequesterError(
        "requester-invocation-signer-required",
        "holder invocation capability is required for native reads"
      );
    }
    if (capability.holderDid !== this.requesterDid || capability.holderDid !== this.signingCapability?.holderDid) {
      throw new TranscriptRequesterError(
        "requester-invocation-signer-mismatch",
        "invocation signer must be the presentation key-binding holder"
      );
    }
    if (this.importedDelegationCid === void 0 || this.importedDelegation === void 0) {
      throw new TranscriptRequesterError(
        "requester-delegation-import-failed",
        "native read requires a confirmed delegation import"
      );
    }
    const session = {
      delegationHeader: { Authorization: this.importedDelegation.encoded },
      delegationCid: this.importedDelegationCid,
      spaceId: this.bootstrap.ownerNode.spaceId,
      verificationMethod: capability.verificationMethod,
      jwk: capability.jwk
    };
    const headers = headersRecord(capability.invoke(session, service, path, action));
    const response = await this.transport.request({
      method: "POST",
      url: `${trimTrailingSlash(this.bootstrap.ownerNode.endpoint)}/invoke`,
      headers,
      ...body === void 0 ? {} : { body }
    });
    this.assertOwnerNodeResponse(response, "/invoke");
    return response;
  }
  async ensureFreshDelegation() {
    if (this.accessEnded) {
      throw new TranscriptRequesterError(
        "requester-access-ended",
        "requester access has ended",
        "access-ended"
      );
    }
    if (this.importedDelegation !== void 0 && !this.requiresRenewal(this.importedDelegation)) {
      return this.importedDelegation;
    }
    if (this.signingCapability === void 0 || this.signingCapability.holderDid !== this.requesterDid) {
      throw new TranscriptRequesterError(
        "requester-renewal-required",
        "a permitted requester signing capability is required for access-triggered renewal",
        "renewal-required"
      );
    }
    try {
      let lastError;
      const attempts = Math.max(1, this.engineRetryAttempts);
      for (let attempt = 0; attempt < attempts; attempt++) {
        const challenge = await this.obtainChallenge();
        const presentation = await this.mintPresentation(challenge);
        try {
          const delegation = await this.resolveOnce(challenge, presentation);
          this.importedDelegation = delegation;
          return delegation;
        } catch (error) {
          if (!(error instanceof TranscriptRequesterError) || error.state !== "unreachable") {
            throw error;
          }
          lastError = error;
        }
        if (attempt + 1 < attempts) {
          await this.sleep(retryDelay(attempt, this.random()));
        }
      }
      throw new TranscriptRequesterError(
        "requester-engine-unreachable",
        lastError instanceof Error ? lastError.message : "policy engine unreachable",
        "unreachable"
      );
    } catch (error) {
      this.recordAccessEnded(error);
      throw error;
    }
  }
  recordAccessEnded(error) {
    if (error instanceof TranscriptRequesterError && error.state === "access-ended") {
      this.accessEnded = true;
    }
  }
  async obtainChallenge() {
    const response = await this.challengeRequestWithRetry({
      method: "POST",
      url: `${trimTrailingSlash(this.bootstrap.policyEngine.endpoint)}/policy/v0/challenge`,
      body: {
        policyId: this.bootstrap.policyId
      }
    });
    return parseEngineSuccess(response.body, ChallengeResponseSchema, "challenge response").challenge;
  }
  async mintPresentation(challenge) {
    if (challenge.policyId !== this.bootstrap.policyId || challenge.audience !== this.bootstrap.policyEngine.audience || challenge.audience !== this.audience) {
      throw new TranscriptRequesterError(
        "requester-engine-response-invalid",
        "challenge response binding does not match requester context"
      );
    }
    if (this.usedChallengeNonces.has(challenge.nonce)) {
      throw new TranscriptRequesterError(
        "requester-challenge-reused",
        "challenge nonce was already used by this requester"
      );
    }
    this.usedChallengeNonces.add(challenge.nonce);
    const expiresAt = new Date(this.now().getTime() + this.presentationTtlSeconds * 1e3).toISOString().replace(".000Z", "Z");
    const input = {
      schema: HOLDER_KEY_BINDING_PRESENTATION_SCHEMA,
      policyId: this.bootstrap.policyId,
      eligibleSubjectDid: this.eligibleSubjectDid,
      holderDid: this.requesterDid,
      holderBinding: this.holderBinding,
      requestedCapabilities: this.requestedCapabilities,
      requestedCapabilitiesHash: this.requestedCapabilitiesHash,
      audience: this.audience,
      nonce: challenge.nonce,
      expiresAt,
      ...this.evidence === void 0 ? {} : { evidence: this.evidence }
    };
    const signature = this.signingCapability.signGrantPresentation === void 0 ? await this.signingCapability.signKeyBinding({
      ...input,
      challengeId: challenge.challengeId,
      issuedAt: expiresAt,
      keyId: this.signingCapability.keyId
    }) : await this.signingCapability.signGrantPresentation(input);
    if (typeof signature !== "string" || signature.length === 0) {
      throw new TranscriptRequesterError(
        "requester-presentation-invalid",
        "signing capability returned an invalid holder key-binding signature"
      );
    }
    return {
      ...input,
      holderSignature: {
        suite: this.signingCapability.suite ?? challenge.acceptedSuites[0],
        signerDid: this.requesterDid,
        value: signature
      }
    };
  }
  async resolveOnce(challenge, presentation) {
    void challenge;
    const response = await this.resolveRequestOnce({
      method: "POST",
      url: `${trimTrailingSlash(this.bootstrap.policyEngine.endpoint)}/policy/v0/resolve`,
      body: { presentation }
    });
    const parsed = parseEngineSuccess(response.body, ResolveResponseSchema, "resolve response");
    return this.importPortableDelegation(parsed.delegation);
  }
  async importPortableDelegation(input) {
    const parsed = normalizeWireDelegation(parseEngineSuccess(input, WireDelegationSchema, "portable delegation"));
    if (parsed.policyId !== this.bootstrap.policyId) {
      throw new TranscriptRequesterError(
        "requester-delegation-invalid",
        "portable delegation policy id does not match bootstrap"
      );
    }
    if (parsed.holderDid !== this.requesterDid) {
      throw new TranscriptRequesterError(
        "requester-delegation-wrong-holder",
        "portable delegation is not targeted at the requester DID"
      );
    }
    if (parsed.issuerDid !== this.grantIssuerDid) {
      throw new TranscriptRequesterError(
        "requester-delegation-invalid",
        "portable delegation issuer does not match the verified grant issuer DID"
      );
    }
    if (parsed.maxTtlSeconds > 300) {
      throw new TranscriptRequesterError(
        "requester-delegation-ttl-excessive",
        "portable delegation TTL exceeds 300 seconds"
      );
    }
    const issuedAt = parseStrictRfc33392(parsed.issuedAt);
    const expiresAt = parseStrictRfc33392(parsed.expiresAt);
    if (expiresAt <= issuedAt || expiresAt - issuedAt > parsed.maxTtlSeconds * 1e3) {
      throw new TranscriptRequesterError(
        "requester-delegation-ttl-excessive",
        "portable delegation expires outside its maxTtlSeconds bound"
      );
    }
    const capabilities = parsed.capabilities.map(
      (capability, index) => parsePolicyCapability(capability, `$.delegation.capabilities[${index}]`)
    );
    for (const granted of capabilities) {
      if (!this.requestedCapabilities.some((requested) => policyCapabilityContains(requested, granted))) {
        throw new TranscriptRequesterError(
          "requester-delegation-capability-wider",
          "portable delegation grants a capability outside the bootstrap requested set"
        );
      }
    }
    if (typeof parsed.encoded !== "string" || parsed.encoded.split(".").length !== 3) {
      throw new TranscriptRequesterError("requester-delegation-invalid", "portable delegation is not a compact-JWS UCAN");
    }
    const delegation = { ...parsed, capabilities };
    const response = await this.transport.request({
      method: "POST",
      url: `${trimTrailingSlash(this.bootstrap.ownerNode.endpoint)}/delegate`,
      headers: { Authorization: parsed.encoded }
    });
    this.assertOwnerNodeResponse(response, "/delegate");
    const receipt = parseDelegateReceipt(response);
    const target = this.bootstrap.ownerNode.spaceId;
    if (!receipt.activated.includes(target) || receipt.skipped.includes(target)) {
      throw new TranscriptRequesterError(
        "requester-delegation-import-failed",
        receipt.activated.includes(target) && receipt.skipped.includes(target) ? "owner node returned a contradictory delegation receipt" : "owner node did not activate the target owner space"
      );
    }
    this.importedDelegationCid = deriveDelegationCid(parsed.encoded);
    return delegation;
  }
  assertOwnerNodeResponse(response, path) {
    const expected = `${trimTrailingSlash(this.bootstrap.ownerNode.endpoint)}${path}`;
    if (response.finalUrl !== expected || response.resolvedAddress === void 0) {
      throw new TranscriptRequesterError(
        "requester-owner-node-endpoint-invalid",
        "owner-node transport metadata is missing or indicates a redirect",
        "bootstrap-invalid"
      );
    }
    if (!this.ownerNodeAddresses.has(normalizeIp(response.resolvedAddress))) {
      throw new TranscriptRequesterError(
        "requester-owner-node-endpoint-invalid",
        "owner-node address changed after endpoint validation",
        "bootstrap-invalid"
      );
    }
  }
  assertContainedByDelegation(delegation, requested) {
    if (this.requiresRenewal(delegation)) {
      throw new TranscriptRequesterError(
        "requester-renewal-required",
        "delegation requires renewal before access",
        "renewal-required"
      );
    }
    if (!delegation.capabilities.some((granted) => policyCapabilityContains(granted, requested))) {
      throw new TranscriptRequesterError(
        "requester-access-not-contained",
        "requested access is outside the imported delegation capabilities",
        "not-contained"
      );
    }
  }
  sqlAccessCapabilityForDelegation(delegation, statement) {
    const grantedSql = delegation.capabilities.find(
      (capability) => capability.service === "tinycloud.sql" && capability.actions.includes("tinycloud.sql/read")
    );
    if (grantedSql === void 0) {
      throw new TranscriptRequesterError("requester-access-not-contained", "delegation has no SQL read grant", "not-contained");
    }
    if (grantedSql.caveats !== void 0) {
      const statements = grantedSql.caveats.statements;
      if (!statements?.some((candidate) => candidate.name === statement.name)) {
        throw new TranscriptRequesterError(
          "requester-access-not-contained",
          "SQL statement is outside the delegated named-statement caveat",
          "not-contained"
        );
      }
      return grantedSql;
    }
    return parsePolicyCapability(
      {
        service: "tinycloud.sql",
        space: grantedSql.space,
        path: grantedSql.path,
        actions: ["tinycloud.sql/read"]
      },
      "$.sqlRead"
    );
  }
  requiresRenewal(delegation) {
    const expiresAt = parseStrictRfc33392(delegation.expiresAt);
    return expiresAt - this.now().getTime() <= REQUESTER_NEAR_EXPIRY_SECONDS * 1e3;
  }
  async challengeRequestWithRetry(request) {
    let lastError;
    const attempts = Math.max(1, this.engineRetryAttempts);
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await this.transport.request(request);
        if (response.status >= 500) {
          lastError = new Error(`engine returned ${response.status}`);
        } else if (response.status >= 400) {
          const denial = parseDenialBody(response.body);
          if (denial !== void 0) {
            throw errorForDenial(denial, response.status);
          }
          throw new TranscriptRequesterError(
            "requester-engine-response-invalid",
            "policy engine returned an invalid denial body"
          );
        } else {
          return response;
        }
      } catch (error) {
        if (error instanceof TranscriptRequesterError && error.state !== "unreachable") {
          throw error;
        }
        lastError = error;
      }
      if (attempt + 1 < attempts) {
        await this.sleep(retryDelay(attempt, this.random()));
      }
    }
    throw new TranscriptRequesterError(
      "requester-engine-unreachable",
      lastError instanceof Error ? lastError.message : "policy engine unreachable",
      "unreachable"
    );
  }
  async resolveRequestOnce(request) {
    try {
      const response = await this.transport.request(request);
      if (response.status >= 500) {
        throw new TranscriptRequesterError(
          "requester-engine-unreachable",
          `engine returned ${response.status}`,
          "unreachable"
        );
      }
      if (response.status >= 400) {
        const denial = parseDenialBody(response.body);
        if (denial !== void 0) {
          throw errorForDenial(denial, response.status);
        }
        throw new TranscriptRequesterError(
          "requester-engine-response-invalid",
          "policy engine returned an invalid denial body"
        );
      }
      return response;
    } catch (error) {
      if (error instanceof TranscriptRequesterError) {
        throw error;
      }
      throw new TranscriptRequesterError(
        "requester-engine-unreachable",
        error instanceof Error ? error.message : "policy engine unreachable",
        "unreachable"
      );
    }
  }
};
async function createTranscriptRequester(options) {
  return TranscriptRequester.create(options);
}
function parseBootstrap(input) {
  const normalized = normalizeExternal(input, "requester-bootstrap-malformed");
  const parsed = BootstrapSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new TranscriptRequesterError(
      parsed.error.issues.some((issue) => issue.code === "unrecognized_keys") ? "requester-bootstrap-unknown-key" : "requester-bootstrap-malformed",
      parsed.error.message,
      "bootstrap-invalid"
    );
  }
  return parsed.data;
}
async function verifyRecordBeforeEgress(bootstrap, options) {
  try {
    return await verifyPolicyEngineRecordForRequester({
      signedRecord: bootstrap.policyEngine.signedRecord,
      ownerDid: options.ownerDid,
      audience: options.audience,
      grantIssuerDid: options.grantIssuerDid,
      now: (options.now ?? (() => /* @__PURE__ */ new Date()))().toISOString().replace(".000Z", "Z"),
      requiredPolicyVersion: POLICY_VERSION_V0,
      requiredEvidenceVerifier: W3C_VC_CREDENTIAL_VERIFIER
    });
  } catch (error) {
    const code = errorCodeForRecordFailure(error);
    throw new TranscriptRequesterError(
      code,
      error instanceof Error ? error.message : String(error),
      "bootstrap-invalid"
    );
  }
}
function errorCodeForRecordFailure(error) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
  if (code === "policy-engine-record-signature-invalid") {
    return "requester-engine-record-signature-invalid";
  }
  if (code === "policy-engine-record-owner-mismatch") {
    return "requester-engine-record-owner-mismatch";
  }
  if (code === "policy-engine-record-audience-mismatch") {
    return "requester-engine-record-audience-mismatch";
  }
  return "requester-engine-record-invalid";
}
function parsePolicyCapability(input, path) {
  try {
    return normalizePolicyCapabilityForRequester(input);
  } catch (error) {
    throw new TranscriptRequesterError(
      "requester-delegation-invalid",
      `${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function listenSqlStatementFromCatalog(statementName) {
  if (typeof statementName !== "string") {
    throw new TranscriptRequesterError(
      "requester-access-not-contained",
      "SQL statement name must be a string from the canonical Listen statement catalog",
      "not-contained"
    );
  }
  const statement = LISTEN_SQL_STATEMENT_BY_NAME.get(statementName);
  if (statement === void 0) {
    throw new TranscriptRequesterError(
      "requester-access-not-contained",
      "SQL statement is not in the canonical Listen statement catalog",
      "not-contained"
    );
  }
  return statement;
}
function normalizePolicyCapabilityForRequester(input) {
  const normalized = normalizeExternal(input, "requester-delegation-invalid");
  return normalizePolicyCapability(normalized);
}
function requestedCapabilitiesHash(capabilities) {
  const canonical = [...capabilities].sort(
    (left, right) => `${left.service}\0${left.space}\0${left.path}`.localeCompare(`${right.service}\0${right.space}\0${right.path}`)
  );
  const encoder = new TextEncoder();
  const domain = encoder.encode("xyz.tinycloud.policy/RequestedCapabilities/v0\0");
  const body = encoder.encode(jcsCanonicalize(canonical));
  const bytes = new Uint8Array(domain.length + body.length);
  bytes.set(domain, 0);
  bytes.set(body, domain.length);
  return bytesToHex3(sha2563(bytes, "bytes")).slice(2);
}
function normalizeWireDelegation(delegation) {
  const issuedAt = parseStrictRfc33392(delegation.issuedAt);
  const expiresAt = parseStrictRfc33392(delegation.expiresAt);
  return {
    delegationId: delegation.delegationId,
    issuerDid: delegation.issuerDid,
    holderDid: delegation.holderDid,
    policyId: delegation.policyId,
    issuedAt: delegation.issuedAt,
    expiresAt: delegation.expiresAt,
    terminal: delegation.terminal,
    maxTtlSeconds: Math.ceil((expiresAt - issuedAt) / 1e3),
    capabilities: delegation.capabilities ?? capabilitiesFromCompactJws(delegation.encoded),
    encoded: delegation.encoded
  };
}
function capabilitiesFromCompactJws(encoded) {
  try {
    const parts = encoded.split(".");
    if (parts.length !== 3) throw new Error("not compact JWS");
    const payload = JSON.parse(new TextDecoder().decode(base64UrlBytes(parts[1])));
    if (payload.att === void 0) throw new Error("UCAN att is absent");
    const capabilities = [];
    for (const [resource, abilities] of Object.entries(payload.att)) {
      const marker = resource.indexOf("/sql/");
      if (!resource.startsWith("tinycloud:") || marker < 0) throw new Error("unsupported UCAN resource");
      const space = resource.slice(0, marker);
      const path = resource.slice(marker + "/sql/".length);
      for (const [action, caveats] of Object.entries(abilities)) {
        const service = action.startsWith("tinycloud.sql/") ? "tinycloud.sql" : action.startsWith("tinycloud.kv/") ? "tinycloud.kv" : void 0;
        if (service === void 0 || caveats.length === 0) throw new Error("unsupported UCAN ability");
        const first = caveats[0];
        capabilities.push({
          service,
          space,
          path,
          actions: [action],
          ...first !== null && typeof first === "object" && !Array.isArray(first) && Object.keys(first).length > 0 ? { caveats: first } : {}
        });
      }
    }
    if (capabilities.length === 0) throw new Error("UCAN att is empty");
    return capabilities;
  } catch (error) {
    throw new TranscriptRequesterError(
      "requester-delegation-invalid",
      `node-native compact-JWS capabilities are invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function base64UrlBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function parseEngineSuccess(input, schema, label) {
  const normalized = normalizeExternal(input, "requester-engine-response-invalid");
  const denial = parseDenialBody(normalized);
  if (denial !== void 0) {
    throw errorForDenial(denial);
  }
  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    throw new TranscriptRequesterError(
      "requester-engine-response-invalid",
      `${label} failed validation: ${parsed.error.message}`
    );
  }
  return parsed.data;
}
function parseDelegateReceipt(response) {
  if (response.status !== 200) {
    throw new TranscriptRequesterError(
      "requester-delegation-import-failed",
      `owner node delegation import returned ${response.status}`,
      response.status >= 500 ? "invalid" : "denied",
      void 0,
      response.status
    );
  }
  const normalized = normalizeExternal(response.body, "requester-delegation-import-failed");
  const parsed = DelegateReceiptSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new TranscriptRequesterError(
      "requester-delegation-import-failed",
      `owner node delegation receipt failed validation: ${parsed.error.message}`
    );
  }
  return parsed.data;
}
function parseNodeDataResponse(response, schema, label) {
  if (response.status >= 500) {
    throw new TranscriptRequesterError(
      "requester-node-unreachable",
      `${label} node returned ${response.status}: ${nodeErrorMessage(response.body)}`,
      "unreachable",
      void 0,
      response.status
    );
  }
  if (response.status >= 400) {
    throw new TranscriptRequesterError(
      "requester-node-denied",
      `${label} node denied: ${nodeErrorMessage(response.body)}`,
      "denied",
      void 0,
      response.status
    );
  }
  const normalized = normalizeExternal(response.body, "requester-node-response-invalid");
  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    throw new TranscriptRequesterError(
      "requester-node-response-invalid",
      `${label} node response failed validation: ${parsed.error.message}`
    );
  }
  return parsed.data;
}
function nodeErrorMessage(body) {
  if (typeof body === "string") return body;
  if (body !== null && typeof body === "object") {
    const record = body;
    const code = typeof record.code === "string" ? record.code : void 0;
    const message = typeof record.message === "string" ? record.message : void 0;
    if (code !== void 0) return message === void 0 ? code : `${code}: ${message}`;
  }
  return "native node refusal";
}
function deriveDelegationCid(encoded) {
  const digest = createDigest(30, blake3(new TextEncoder().encode(encoded)));
  return CID.createV1(85, digest).toString();
}
function headersRecord(headers) {
  return Array.isArray(headers) ? Object.fromEntries(headers) : headers;
}
async function validateAndResolveOwnerNode(endpoint, transport) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw ownerEndpointError("owner-node endpoint is not a URL");
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.hash !== "") {
    throw ownerEndpointError("owner-node endpoint must use HTTPS without credentials or fragments");
  }
  if (transport.resolveEndpoint === void 0) {
    throw ownerEndpointError("owner-node endpoint resolution metadata is required");
  }
  let resolution;
  try {
    resolution = await transport.resolveEndpoint(url.origin);
  } catch (error) {
    throw ownerEndpointError(`owner-node endpoint resolution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (resolution.addresses.length === 0) {
    throw ownerEndpointError("owner-node endpoint resolved to no addresses");
  }
  const addresses = /* @__PURE__ */ new Set();
  for (const address of resolution.addresses) {
    const normalized = normalizeIp(address);
    if (!isPublicIp(normalized)) {
      throw ownerEndpointError(`owner-node endpoint resolved to a non-public address: ${address}`);
    }
    addresses.add(normalized);
  }
  return addresses;
}
function ownerEndpointError(message) {
  return new TranscriptRequesterError(
    "requester-owner-node-endpoint-invalid",
    message,
    "bootstrap-invalid"
  );
}
function normalizeIp(value) {
  return value.toLowerCase().replace(/^\[|\]$/g, "");
}
function isPublicIp(value) {
  const ip = normalizeIp(value);
  const parts = ip.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) <= 255)) {
    const [a, b] = parts.map(Number);
    return !(a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 0 || a === 192 && b === 168 || a === 198 && (b === 18 || b === 19) || a === 198 && b === 51 && parts[2] === "100" || a === 203 && b === 0 && parts[2] === "113" || a >= 224);
  }
  if (!ip.includes(":")) return false;
  if (ip === "::" || ip === "::1" || ip.startsWith("2001:db8:") || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb") || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("ff")) return false;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped !== null) return isPublicIp(mapped[1]);
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex !== null) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    return isPublicIp(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  return true;
}
function parseDenialBody(input) {
  const normalized = normalizeExternal(input, "requester-engine-response-invalid");
  const direct = DenialSchema.safeParse(normalized);
  if (direct.success) {
    return { code: direct.data.code, message: direct.data.message };
  }
  const envelope = ErrorEnvelopeDenialSchema.safeParse(normalized);
  if (envelope.success) {
    return { code: envelope.data.error.code, message: envelope.data.error.message };
  }
  return void 0;
}
function errorForDenial(denial, status) {
  const accessEnded = denial.code === "policy-inactive" || denial.code === "policy-revoked" || denial.code === "policy-expired";
  return new TranscriptRequesterError(
    `policy-engine-denied-${denial.code}`,
    denial.message ?? `policy engine denied ${denial.code}`,
    accessEnded ? "access-ended" : "denied",
    denial.code,
    status
  );
}
function retryDelay(attempt, random) {
  const base = Math.min(REQUESTER_ENGINE_RETRY_MAX_DELAY_MS, 50 * 2 ** attempt);
  return Math.min(REQUESTER_ENGINE_RETRY_MAX_DELAY_MS, Math.floor(base * (0.5 + random)));
}
function trimTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
function normalizeExternal(input, code) {
  try {
    return normalizeJson(input);
  } catch (error) {
    throw new TranscriptRequesterError(
      code,
      error instanceof Error ? error.message : String(error)
    );
  }
}
function parseStrictRfc33392(value) {
  if (!/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
    value
  )) {
    return void 0;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return void 0;
  }
  const canonical = new Date(parsed).toISOString().replace(".000Z", "Z");
  const reparsed = Date.parse(value);
  return Date.parse(canonical) === reparsed ? parsed : void 0;
}
export {
  HOLDER_KEY_BINDING_PRESENTATION_SCHEMA,
  LISTEN_SQL_STATEMENT_CATALOG,
  POLICY_ENGINE_CHALLENGE_REQUEST_SCHEMA,
  POLICY_ENGINE_CHALLENGE_RESPONSE_SCHEMA,
  POLICY_ENGINE_DENIAL_SCHEMA,
  POLICY_ENGINE_GRANT_PRESENTATION_DENIAL_CODES,
  POLICY_ENGINE_RESOLVE_REQUEST_SCHEMA,
  PORTABLE_DELEGATION_SCHEMA,
  REQUESTER_ENGINE_RETRY_ATTEMPTS,
  REQUESTER_ENGINE_RETRY_MAX_DELAY_MS,
  REQUESTER_NEAR_EXPIRY_SECONDS,
  TranscriptRequester,
  TranscriptRequesterError,
  createTranscriptRequester,
  deriveDelegationCid
};
//# sourceMappingURL=index.js.map
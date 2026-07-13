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
function toSignedObjectError(error) {
  if (error instanceof SignedObjectProfileError) {
    return error;
  }
  return new SignedObjectProfileError(
    "schema-invalid",
    error instanceof Error ? error.message : String(error)
  );
}

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
var POLICY_CAPABILITY_DOMAIN = "xyz.tinycloud.policy/PolicyCapability/v0";
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
function policyCapabilityDigestHex(input) {
  const canonical = canonicalizePolicyCapability(input);
  const jcs = textEncoder.encode(jcsCanonicalize(canonical));
  const domain = textEncoder.encode(`${POLICY_CAPABILITY_DOMAIN}\0`);
  const bytes = new Uint8Array(domain.length + jcs.length);
  bytes.set(domain, 0);
  bytes.set(jcs, domain.length);
  return bytesToHex(sha256(bytes, "bytes")).slice(2);
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
function canonicalizeSignedObjectUnsigned(input) {
  return jcsCanonicalize(input);
}
function deriveSignedObjectMaterial(input) {
  const descriptor = descriptorForUnsigned(input);
  const unsigned = validateUnsignedForDescriptor(input, descriptor);
  return materialForUnsigned(unsigned, descriptor);
}
function signedObjectIdFor(input) {
  return deriveSignedObjectMaterial(input).id;
}
async function createAndSignSignedObject(input, signer) {
  const normalized = expectJsonObject(normalizeJson(input), "$");
  const descriptor = descriptorForUnsigned(normalized);
  const stripped = stripOwnIdAndSignature(normalized, descriptor);
  const unsigned = validateUnsignedForDescriptor(stripped, descriptor);
  if (descriptor.kind === "Policy") {
    validatePolicyPermissionsCeilingForSigning(unsigned);
  }
  assertSupportedSignatureSuite(signer.suite);
  requireStringType(signer.signerDid, "$.signer.signerDid");
  assertSignerDidMatchesSuite(signer.signerDid, signer.suite);
  assertSigningKeyBindingForCreate(unsigned, signer.signerDid);
  const material = materialForUnsigned(unsigned, descriptor);
  const signatureValue = encodeSignatureValue(
    await signer.signDigest(material.digest),
    signer.suite
  );
  const signature = validateSignature({
    suite: signer.suite,
    signerDid: signer.signerDid,
    value: signatureValue
  });
  return {
    ...unsigned,
    [descriptor.idField]: material.id,
    signature
  };
}
function createAndSignPolicy(input, signer) {
  return createAndSignSignedObject(input, signer).then(
    (object) => validatePolicySignedShape(object)
  );
}
function createAndSignPolicyStatus(input, signer) {
  return createAndSignSignedObject(input, signer).then(
    (object) => validatePolicyStatusSignedShape(object)
  );
}
function createAndSignPolicyEngineRecord(input, signer) {
  return createAndSignSignedObject(input, signer).then(
    (object) => validatePolicyEngineRecordSignedShape(object)
  );
}
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
async function verifyPolicy(input) {
  const result = await verifySignedObject(input);
  return {
    object: validatePolicySignedShape(result.object),
    material: result.material
  };
}
async function verifyPolicyStatus(input) {
  const result = await verifySignedObject(input);
  return {
    object: validatePolicyStatusSignedShape(result.object),
    material: result.material
  };
}
async function verifyPolicyEngineRecord(input) {
  const result = await verifySignedObject(input);
  return {
    object: validatePolicyEngineRecordSignedShape(result.object),
    material: result.material
  };
}
async function validatePolicySigned(input) {
  try {
    const result = await verifyPolicy(input);
    return { ok: true, object: result.object, material: result.material };
  } catch (error) {
    return { ok: false, error: toSignedObjectError(error) };
  }
}
async function validatePolicyStatusSigned(input) {
  try {
    const result = await verifyPolicyStatus(input);
    return { ok: true, object: result.object, material: result.material };
  } catch (error) {
    return { ok: false, error: toSignedObjectError(error) };
  }
}
async function validatePolicyEngineRecordSigned(input) {
  try {
    const result = await verifyPolicyEngineRecord(input);
    return { ok: true, object: result.object, material: result.material };
  } catch (error) {
    return { ok: false, error: toSignedObjectError(error) };
  }
}
function validatePolicyUnsigned(input) {
  return validatePolicyShape(input, false);
}
function validatePolicyStatusUnsigned(input) {
  return validatePolicyStatusShape(input, false);
}
function validatePolicyEngineRecordUnsigned(input) {
  return validatePolicyEngineRecordShape(input, false);
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
function validateUnsignedForDescriptor(input, descriptor) {
  switch (descriptor.kind) {
    case "Policy":
      return validatePolicyUnsigned(input);
    case "PolicyStatus":
      return validatePolicyStatusUnsigned(input);
    case "PolicyEngineRecord":
      return validatePolicyEngineRecordUnsigned(input);
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
function validatePolicyPermissionsCeilingForSigning(input) {
  const resource = expectJsonObject(requiredValue2(input, "resource", "$"), "$.resource");
  const ceiling = requiredArray2(resource, "permissionsCeiling", "$.resource", 1);
  for (let index = 0; index < ceiling.length; index++) {
    validatePolicyCapabilityForSigning(
      ceiling[index],
      `$.resource.permissionsCeiling[${index}]`
    );
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
function validatePolicyCapabilityForSigning(input, path) {
  const object = expectJsonObject(input, path);
  try {
    const canonical = normalizePolicyCapability(object);
    if (jcsCanonicalize(object) !== jcsCanonicalize(canonical)) {
      throw new SignedObjectSchemaError(`${path} must be strict canonical PolicyCapability JSON`);
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
function assertSigningKeyBindingForCreate(unsigned, signerDid) {
  if (!hasOwn2(unsigned, "signingKeyDid")) {
    return;
  }
  const signingKeyDid = requiredString2(unsigned, "signingKeyDid", "$");
  if (signingKeyDid !== signerDid) {
    throw new SigningKeyBindingError(
      `signer DID ${signerDid} does not match signingKeyDid ${signingKeyDid}`
    );
  }
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
function assertSignerDidMatchesSuite(signerDid, suite) {
  if (suite === ED25519_JCS_SIGNATURE_SUITE) {
    ed25519PublicKeyFromDidKey(signerDid);
    return;
  }
  if (suite === EIP191_JCS_SIGNATURE_SUITE) {
    parseDidPkh(signerDid);
    return;
  }
  throw new UnsupportedSignatureSuiteError(`unsupported signature suite: ${suite}`);
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
function encodeSignatureValue(value, suite) {
  if (typeof value === "string") {
    const encoded2 = value.startsWith("0x") ? base64UrlEncode(hexToBytes(value)) : value;
    decodeSignatureValue(encoded2, suite);
    return encoded2;
  }
  const encoded = base64UrlEncode(value);
  decodeSignatureValue(encoded, suite);
  return encoded;
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
function descriptorForUnsigned(input) {
  const object = expectJsonObject(normalizeJson(input), "$");
  return descriptorForSchema(requiredString2(object, "schema", "$"));
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
function hexToBytes(value) {
  const hex = value.slice(2);
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new SignatureMaterialError("hex signature must have even length");
  }
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index++) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
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
async function createAndSignTranscriptSharePolicy(input, signer) {
  const normalized = expectObject2(input, "$", "policy-authoring-malformed");
  assertExactKeys3(
    normalized,
    [
      "ownerDid",
      "signingKeyDid",
      "createdAt",
      "expiresAt",
      "resourceType",
      "resourceId",
      "permissionsCeiling",
      "when",
      "grant",
      "disclosure",
      "audit"
    ],
    "$"
  );
  const permissions = requiredArray3(normalized, "permissionsCeiling", "$");
  if (permissions.length === 0) {
    throw new PolicyAuthoringError(
      "policy-authoring-malformed",
      "$.permissionsCeiling must not be empty"
    );
  }
  const ceiling = [];
  for (let index = 0; index < permissions.length; index++) {
    ceiling.push(wrapCapabilityError(() => normalizePolicyCapability(permissions[index])));
  }
  return createAndSignPolicy(
    {
      schema: POLICY_SCHEMA,
      ownerDid: requiredString3(normalized, "ownerDid", "$"),
      signingKeyDid: requiredString3(normalized, "signingKeyDid", "$"),
      createdAt: requiredString3(normalized, "createdAt", "$"),
      ...hasOwn3(normalized, "expiresAt") ? { expiresAt: requiredString3(normalized, "expiresAt", "$") } : {},
      resource: {
        resourceType: requiredString3(normalized, "resourceType", "$"),
        resourceId: requiredString3(normalized, "resourceId", "$"),
        permissionsCeiling: ceiling
      },
      when: requiredObject(normalized, "when", "$"),
      grant: requiredObject(normalized, "grant", "$"),
      ...hasOwn3(normalized, "disclosure") ? { disclosure: requiredObject(normalized, "disclosure", "$") } : {},
      ...hasOwn3(normalized, "audit") ? { audit: requiredObject(normalized, "audit", "$") } : {}
    },
    signer
  ).catch((error) => {
    throw wrapSignedObjectError(error);
  });
}
function createUnsignedPolicyEngineRecord(input) {
  const normalized = expectObject2(input, "$", "policy-authoring-malformed");
  assertExactKeys3(
    normalized,
    [
      "ownerDid",
      "endpoint",
      "audience",
      "grantIssuerDid",
      "expiresAt",
      "supportedPolicyVersions",
      "supportedEvidenceVerifiers"
    ],
    "$"
  );
  const supportedPolicyVersions = hasOwn3(normalized, "supportedPolicyVersions") ? requiredStringArray2(normalized, "supportedPolicyVersions", "$") : [POLICY_VERSION_V0];
  validateSupportedPolicyVersions(supportedPolicyVersions, "$.supportedPolicyVersions");
  const supportedEvidenceVerifiers = hasOwn3(normalized, "supportedEvidenceVerifiers") ? requiredStringArray2(normalized, "supportedEvidenceVerifiers", "$") : [W3C_VC_CREDENTIAL_VERIFIER];
  validateSupportedEvidenceVerifiers(
    supportedEvidenceVerifiers,
    "$.supportedEvidenceVerifiers"
  );
  const expiresAt = fieldString(
    normalized,
    "expiresAt",
    "$",
    "policy-engine-record-date-invalid"
  );
  parseStrictRfc3339(expiresAt, "$.expiresAt");
  return {
    schema: POLICY_ENGINE_RECORD_SCHEMA,
    ownerDid: requiredString3(normalized, "ownerDid", "$"),
    endpoint: requiredString3(normalized, "endpoint", "$"),
    audience: requiredString3(normalized, "audience", "$"),
    supportedPolicyVersions,
    supportedEvidenceVerifiers,
    grantIssuerDid: requiredString3(normalized, "grantIssuerDid", "$"),
    expiresAt
  };
}
async function createAndSignRequesterPolicyEngineRecord(input, signer) {
  return createAndSignPolicyEngineRecord(createUnsignedPolicyEngineRecord(input), signer).catch(
    (error) => {
      throw wrapSignedObjectError(error);
    }
  );
}
function composeTranscriptShareBootstrap(input) {
  const normalized = expectObject2(input, "$", "transcript-share-bootstrap-malformed");
  assertExactKeys3(normalized, ["policyId", "policyEngineRecord", "ownerNodeEndpoint", "ownerSpaceId", "resourceHint"], "$");
  const signedRecord = expectPolicyEngineRecord(
    requiredValue3(normalized, "policyEngineRecord", "$")
  );
  if (!signedRecord.supportedEvidenceVerifiers.includes(W3C_VC_CREDENTIAL_VERIFIER)) {
    throw new PolicyAuthoringError(
      "transcript-share-bootstrap-malformed",
      "policy engine record does not support the bootstrap evidence verifier"
    );
  }
  return {
    schema: TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA,
    policyId: requiredString3(normalized, "policyId", "$"),
    policyEngine: {
      endpoint: signedRecord.endpoint,
      audience: signedRecord.audience,
      supportedEvidenceVerifiers: [W3C_VC_CREDENTIAL_VERIFIER],
      signedRecord
    },
    ownerNode: {
      schema: OWNER_NODE_ENDPOINT_SCHEMA,
      endpoint: validateOwnerNodeEndpoint(requiredString3(normalized, "ownerNodeEndpoint", "$")),
      spaceId: requiredString3(normalized, "ownerSpaceId", "$")
    },
    resourceHint: requiredObject(normalized, "resourceHint", "$")
  };
}
function validateOwnerNodeEndpoint(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new PolicyAuthoringError("transcript-share-bootstrap-malformed", "$.ownerNodeEndpoint must be a URL");
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.hash !== "") {
    throw new PolicyAuthoringError(
      "transcript-share-bootstrap-malformed",
      "$.ownerNodeEndpoint must be an HTTPS URL without credentials or a fragment"
    );
  }
  return url.toString().replace(/\/$/, "");
}
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
function expectPolicyEngineRecord(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PolicyAuthoringError(
      "transcript-share-bootstrap-malformed",
      "$.policyEngineRecord must be an object"
    );
  }
  try {
    return validatePolicyEngineRecordSignedShape(input);
  } catch (error) {
    throw new PolicyAuthoringError(
      "transcript-share-bootstrap-malformed",
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
function requiredObject(object, key, path) {
  const value = requiredValue3(object, key, path);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new PolicyAuthoringError("policy-authoring-malformed", `${path}.${key} must be an object`);
  }
  return value;
}
function requiredArray3(object, key, path) {
  const value = requiredValue3(object, key, path);
  if (!Array.isArray(value)) {
    throw new PolicyAuthoringError("policy-authoring-malformed", `${path}.${key} must be an array`);
  }
  return value;
}
function requiredStringArray2(object, key, path) {
  const values = requiredArray3(object, key, path);
  return values.map((value, index) => {
    if (typeof value !== "string" || value.length === 0) {
      throw new PolicyAuthoringError(
        "policy-authoring-malformed",
        `${path}.${key}[${index}] must be a non-empty string`
      );
    }
    return value;
  });
}
function validateSupportedPolicyVersions(values, path) {
  if (values.length === 0) {
    throw new PolicyAuthoringError(
      "policy-authoring-malformed",
      `${path} must not be empty`
    );
  }
  for (let index = 0; index < values.length; index++) {
    if (values[index] !== POLICY_VERSION_V0) {
      throw new PolicyAuthoringError(
        "policy-authoring-malformed",
        `${path}[${index}] is unsupported`
      );
    }
  }
}
function validateSupportedEvidenceVerifiers(values, path) {
  if (values.length === 0) {
    throw new PolicyAuthoringError(
      "policy-authoring-malformed",
      `${path} must not be empty`
    );
  }
  for (let index = 0; index < values.length; index++) {
    if (values[index] !== W3C_VC_CREDENTIAL_VERIFIER) {
      throw new PolicyAuthoringError(
        "policy-authoring-malformed",
        `${path}[${index}] is unsupported`
      );
    }
  }
}
function wrapCapabilityError(fn) {
  try {
    return fn();
  } catch (error) {
    if (error instanceof PolicyCapabilityError) {
      throw new PolicyAuthoringError(error.code, error.message);
    }
    throw error;
  }
}
function wrapSignedObjectError(error) {
  if (error instanceof PolicyAuthoringError) {
    return error;
  }
  if (error instanceof SignedObjectSchemaError || error instanceof SignedObjectProfileError) {
    return new PolicyAuthoringError("policy-authoring-malformed", error.message);
  }
  return new PolicyAuthoringError(
    "policy-authoring-malformed",
    error instanceof Error ? error.message : String(error)
  );
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
export {
  ED25519_JCS_SIGNATURE_SUITE,
  EIP191_JCS_SIGNATURE_SUITE,
  OWNER_NODE_ENDPOINT_SCHEMA,
  POLICY_ENGINE_RECORD_SCHEMA,
  POLICY_SCHEMA,
  POLICY_STATUS_SCHEMA,
  POLICY_VERSION_V0,
  PolicyAuthoringError,
  PolicyCapabilityError,
  SignatureMaterialError,
  SignatureVerificationError,
  SignedObjectCanonicalizationError,
  SignedObjectDigestError,
  SignedObjectIdError,
  SignedObjectProfileError,
  SignedObjectSchemaError,
  SigningKeyBindingError,
  TRANSCRIPT_SHARE_BOOTSTRAP_SCHEMA,
  UnsupportedSignatureSuiteError,
  W3C_VC_CREDENTIAL_VERIFIER,
  canonicalizePolicyCapability,
  canonicalizeSignedObjectUnsigned,
  composeTranscriptShareBootstrap,
  createAndSignPolicy,
  createAndSignPolicyEngineRecord,
  createAndSignPolicyStatus,
  createAndSignRequesterPolicyEngineRecord,
  createAndSignSignedObject,
  createAndSignTranscriptSharePolicy,
  createUnsignedPolicyEngineRecord,
  deriveSignedObjectMaterial,
  jcsCanonicalize,
  normalizeJson,
  normalizePolicyCapability,
  policyCapabilityContains,
  policyCapabilityDigestHex,
  serialize as serializeJcsJson,
  signedObjectIdFor,
  toSignedObjectError,
  validatePolicyEngineRecordSigned,
  validatePolicyEngineRecordSignedShape,
  validatePolicyEngineRecordUnsigned,
  validatePolicySigned,
  validatePolicySignedShape,
  validatePolicyStatusSigned,
  validatePolicyStatusSignedShape,
  validatePolicyStatusUnsigned,
  validatePolicyUnsigned,
  verifyPolicy,
  verifyPolicyEngineRecord,
  verifyPolicyEngineRecordForRequester,
  verifyPolicyStatus,
  verifySignedObject
};
//# sourceMappingURL=index.js.map
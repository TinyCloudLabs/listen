import type { DelegatedAccess } from "@listen/server";

// The Otter session cookie (sessionid + csrftoken) is stored as a TinyCloud
// Secret, sealed to the user's encryption network — only openable inside the
// attested backend. Otter has no OAuth/API keys, so this broad cookie is the
// delegation; the TEE + this open code is what restricts how it's used.
export const OTTER_COOKIE_SECRET_NAME = "OTTER_COOKIE";
export const OTTER_COOKIE_SECRET_SCOPE = "listen";

export interface OtterCookie {
  sessionid: string;
  csrftoken: string;
}

export interface OtterSecretError {
  code?: string;
  message?: string;
}

export type OtterSecretResult =
  | { ok: true; data: OtterCookie }
  | { ok: false; reason: "missing"; error: OtterSecretError }
  | { ok: false; reason: "unavailable"; error: OtterSecretError };

interface SecretAccess {
  get(name: string, options?: { scope?: string }): Promise<any>;
  put?(name: string, value: string, options?: { scope?: string }): Promise<any>;
  delete?(name: string, options?: { scope?: string }): Promise<any>;
}

type OtterSecretAccess = (DelegatedAccess & { secrets?: SecretAccess }) | undefined;

function parseCookie(raw: string): OtterCookie | null {
  try {
    const value = JSON.parse(raw);
    const sessionid = value.sessionid;
    const csrftoken = value.csrftoken;
    if (typeof sessionid === "string" && typeof csrftoken === "string" && sessionid && csrftoken) {
      return { sessionid, csrftoken };
    }
    return null;
  } catch {
    return null;
  }
}

function isMissingSecretError(error: OtterSecretError | undefined): boolean {
  const code = typeof error?.code === "string" ? error.code.toLowerCase() : "";
  return code === "key_not_found" || code === "not_found" || code === "kv_not_found";
}

function invalidSecret(message: string): OtterSecretResult {
  return {
    ok: false,
    reason: "unavailable",
    error: { code: "INVALID_SECRET_RESPONSE", message },
  };
}

export async function readOtterCookieResult(access: OtterSecretAccess): Promise<OtterSecretResult> {
  if (!access?.secrets?.get) {
    return {
      ok: false,
      reason: "unavailable",
      error: {
        code: "SECRETS_ACCESS_MISSING",
        message: "Delegation does not include TinyCloud Secrets access",
      },
    };
  }

  let result: any;
  try {
    result = await access.secrets.get(OTTER_COOKIE_SECRET_NAME, {
      scope: OTTER_COOKIE_SECRET_SCOPE,
    });
  } catch (error) {
    return {
      ok: false,
      reason: "unavailable",
      error: {
        code:
          typeof (error as { code?: unknown })?.code === "string"
            ? (error as { code: string }).code
            : "secret_read_failed",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }

  if (result?.ok !== true) {
    return {
      ok: false,
      reason: isMissingSecretError(result?.error) ? "missing" : "unavailable",
      error: {
        code: result?.error?.code,
        message: result?.error?.message,
      },
    };
  }

  if (typeof result.data !== "string" || result.data.trim() === "") {
    return invalidSecret(
      `${OTTER_COOKIE_SECRET_NAME} returned an invalid successful secret response`,
    );
  }

  const cookie = parseCookie(result.data);
  return cookie
    ? { ok: true, data: cookie }
    : invalidSecret(`${OTTER_COOKIE_SECRET_NAME} contains a malformed cookie`);
}

export async function readOtterCookie(access: OtterSecretAccess): Promise<OtterCookie | null> {
  const result = await readOtterCookieResult(access);
  if (result.ok) return result.data;
  if (result.reason === "missing") return null;
  throw new OtterSecretReadError(result.error.code ?? "secret_read_failed", result.error.message);
}

export async function otterCookieExists(access: OtterSecretAccess): Promise<boolean> {
  const result = await readOtterCookieResult(access);
  if (result.ok) return true;
  if (result.reason === "missing") return false;
  throw new OtterSecretReadError(result.error.code ?? "secret_read_failed", result.error.message);
}

export class OtterSecretReadError extends Error {
  readonly code: string;

  constructor(code: string, message = "Failed to read Otter cookie") {
    super(message);
    this.name = "OtterSecretReadError";
    this.code = code;
  }
}

export async function writeOtterCookie(
  access: OtterSecretAccess,
  cookie: OtterCookie,
): Promise<void> {
  if (!access?.secrets?.put) {
    throw new Error("Delegation does not include TinyCloud Secrets write access");
  }
  const result = await access.secrets.put(OTTER_COOKIE_SECRET_NAME, JSON.stringify(cookie), {
    scope: OTTER_COOKIE_SECRET_SCOPE,
  });
  if (!result?.ok) {
    throw new Error(result?.error?.message ?? "Failed to store Otter cookie in TinyCloud Secrets");
  }
}

export async function deleteOtterCookie(access: OtterSecretAccess): Promise<void> {
  if (!access?.secrets?.delete) {
    throw new OtterSecretDeleteError(
      "SECRETS_DELETE_ACCESS_MISSING",
      "Delegation does not include TinyCloud Secrets delete access",
    );
  }

  let result: any;
  try {
    result = await access.secrets.delete(OTTER_COOKIE_SECRET_NAME, {
      scope: OTTER_COOKIE_SECRET_SCOPE,
    });
  } catch (error) {
    throw new OtterSecretDeleteError(
      typeof (error as { code?: unknown })?.code === "string"
        ? (error as { code: string }).code
        : "secret_delete_failed",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (result?.ok === true) return;
  if (isMissingSecretError(result?.error)) return;
  throw new OtterSecretDeleteError(
    typeof result?.error?.code === "string" ? result.error.code : "INVALID_DELETE_RESPONSE",
    result?.error?.message ?? "Failed to delete Otter cookie from TinyCloud Secrets",
  );
}

export class OtterSecretDeleteError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OtterSecretDeleteError";
    this.code = code;
  }
}

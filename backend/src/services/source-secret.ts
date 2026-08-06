import type { DelegatedAccess } from "@listen/server";

export interface SourceSecretError {
  code?: string;
  message?: string;
}

export type SourceSecretResult =
  | { ok: true; data: string }
  | { ok: false; reason: "missing"; error: SourceSecretError }
  | { ok: false; reason: "unavailable"; error: SourceSecretError };

export interface SourceSecretReader {
  get(name: string): Promise<any>;
}

export function isMissingSourceSecretError(error: SourceSecretError): boolean {
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  return code === "key_not_found" || code === "not_found" || code === "kv_not_found";
}

export async function readSourceApiKeyResult(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
  secretName: string,
): Promise<SourceSecretResult> {
  return readSourceSecretResult(access?.secrets, secretName);
}

export async function readSourceSecretResult(
  secrets: SourceSecretReader | undefined,
  secretName: string,
): Promise<SourceSecretResult> {
  if (!secrets) {
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
    result = await secrets.get(secretName);
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "secret_read_failed";
    return {
      ok: false,
      reason: "unavailable",
      error: {
        code,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  if (!result?.ok) {
    return {
      ok: false,
      reason: isMissingSourceSecretError(result?.error ?? {}) ? "missing" : "unavailable",
      error: {
        code: result?.error?.code,
        message: result?.error?.message,
      },
    };
  }

  if (typeof result.data !== "string" || result.data.trim() === "") {
    return {
      ok: false,
      reason: "unavailable",
      error: {
        code: "INVALID_SECRET_RESPONSE",
        message: `${secretName} returned an invalid successful secret response`,
      },
    };
  }

  return { ok: true, data: result.data };
}

import type { DelegatedAccess } from "@listen/server";

interface SourceSecretError {
  code?: string;
  message?: string;
}

export type SourceSecretResult =
  { ok: true; data: string } | { ok: false; error: SourceSecretError };

export async function readSourceApiKeyResult(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
  secretName: string,
): Promise<SourceSecretResult> {
  if (!access?.secrets) {
    return {
      ok: false,
      error: {
        code: "SECRETS_ACCESS_MISSING",
        message: "Delegation does not include TinyCloud Secrets access",
      },
    };
  }

  const result = await access.secrets.get(secretName);
  if (!result?.ok) {
    return {
      ok: false,
      error: {
        code: result?.error?.code,
        message: result?.error?.message,
      },
    };
  }

  if (!result.data) {
    return {
      ok: false,
      error: {
        code: "KEY_NOT_FOUND",
        message: `${secretName} is empty`,
      },
    };
  }

  return { ok: true, data: result.data };
}

export async function sourceApiKeyExists(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
  secretName: string,
): Promise<boolean> {
  return (await readSourceApiKeyResult(access, secretName)).ok;
}

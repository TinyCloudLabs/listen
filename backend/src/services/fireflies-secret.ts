import type { Request } from "express";
import type { DelegatedAccess } from "@listen/server";
import { FIREFLIES_SECRET_NAME } from "../manifest.js";

interface FirefliesSecretError {
  code?: string;
  message?: string;
}

type FirefliesSecretResult =
  | { ok: true; data: string }
  | { ok: false; error: FirefliesSecretError };

export async function readFirefliesApiKey(req: Request): Promise<string | null> {
  const result = await readFirefliesApiKeyResult(req.delegatedAccess);
  return result.ok ? result.data : null;
}

export async function readFirefliesApiKeyFromAccess(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
): Promise<string | null> {
  const result = await readFirefliesApiKeyResult(access);
  return result.ok ? result.data : null;
}

export async function readFirefliesApiKeyResult(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
): Promise<FirefliesSecretResult> {
  if (!access?.secrets) {
    return {
      ok: false,
      error: {
        code: "SECRETS_ACCESS_MISSING",
        message: "Delegation does not include TinyCloud Secrets access",
      },
    };
  }

  const result = await access?.secrets?.get(FIREFLIES_SECRET_NAME);
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
        message: "Fireflies API key is empty",
      },
    };
  }

  return { ok: true, data: result.data };
}

export async function firefliesApiKeyExists(req: Request): Promise<boolean> {
  return (await readFirefliesApiKey(req)) != null;
}

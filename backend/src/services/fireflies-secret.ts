import type { Request } from "express";
import type { DelegatedAccess } from "@listen/server";
import { FIREFLIES_SECRET_NAME } from "../manifest.js";
import { readSourceApiKeyResult, type SourceSecretResult } from "./source-secret.js";

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
): Promise<SourceSecretResult> {
  return readSourceApiKeyResult(access, FIREFLIES_SECRET_NAME);
}

export async function firefliesApiKeyExists(req: Request): Promise<boolean> {
  return (await readFirefliesApiKey(req)) != null;
}

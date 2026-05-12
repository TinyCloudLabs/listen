import type { Request } from "express";
import type { DelegatedAccess } from "@listen/server";
import { GRANOLA_SECRET_NAME } from "../manifest.js";
import { readSourceApiKeyResult, type SourceSecretResult } from "./source-secret.js";

export async function readGranolaApiKey(req: Request): Promise<string | null> {
  const result = await readGranolaApiKeyResult(req.delegatedAccess);
  return result.ok ? result.data : null;
}

export async function readGranolaApiKeyResult(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
): Promise<SourceSecretResult> {
  return readSourceApiKeyResult(access, GRANOLA_SECRET_NAME);
}

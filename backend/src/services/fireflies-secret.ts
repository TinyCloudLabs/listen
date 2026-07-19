import type { DelegatedAccess } from "@listen/server";
import { FIREFLIES_SECRET_NAME } from "../manifest.js";
import { readSourceApiKeyResult, type SourceSecretResult } from "./source-secret.js";

export async function readFirefliesApiKeyResult(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
): Promise<SourceSecretResult> {
  return readSourceApiKeyResult(access, FIREFLIES_SECRET_NAME);
}

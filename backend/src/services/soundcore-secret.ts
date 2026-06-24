import type { Request } from "express";
import type { DelegatedAccess } from "@listen/server";
import {
  SOUNDCORE_AUTH_TOKEN_SECRET_NAME,
  SOUNDCORE_OPENUDID_SECRET_NAME,
  SOUNDCORE_SESSION_SECRET_NAME,
  SOUNDCORE_UID_SECRET_NAME,
} from "../manifest.js";
import { readSourceApiKeyResult, type SourceSecretResult } from "./source-secret.js";
import type { SoundcoreCredentials } from "./soundcore-client.js";

const SOUNDCORE_SECRET_NAMES = [
  SOUNDCORE_AUTH_TOKEN_SECRET_NAME,
  SOUNDCORE_UID_SECRET_NAME,
  SOUNDCORE_OPENUDID_SECRET_NAME,
] as const;

export async function readSoundcoreCredentials(req: Request): Promise<SoundcoreCredentials | null> {
  const result = await readSoundcoreCredentialsResult(req.delegatedAccess);
  return result.ok ? result.data : null;
}

export type SoundcoreCredentialsResult =
  | { ok: true; data: SoundcoreCredentials }
  | { ok: false; error: { code?: string; message?: string; missing?: string[] } };

export async function readSoundcoreCredentialsResult(
  access: (DelegatedAccess & { secrets?: { get(name: string): Promise<any> } }) | undefined,
): Promise<SoundcoreCredentialsResult> {
  const sessionResult = await readSourceApiKeyResult(access, SOUNDCORE_SESSION_SECRET_NAME);
  if (sessionResult.ok) {
    const parsed = parseSoundcoreSessionSecret(sessionResult.data);
    if (parsed) return { ok: true, data: parsed };
    return {
      ok: false,
      error: {
        code: "INVALID_SOUNDCORE_SESSION",
        missing: [SOUNDCORE_SESSION_SECRET_NAME],
        message:
          "Soundcore credentials are malformed. Re-save the Soundcore session headers in Listen.",
      },
    };
  }

  const results = await Promise.all(
    SOUNDCORE_SECRET_NAMES.map(
      async (name) => [name, await readSourceApiKeyResult(access, name)] as const,
    ),
  );
  const missing: string[] = [];
  const values = new Map<string, string>();
  let firstError: SourceSecretResult | null = null;

  for (const [name, result] of results) {
    if (result.ok) {
      values.set(name, result.data);
    } else {
      missing.push(name);
      firstError ??= result;
    }
  }

  if (missing.length > 0) {
    const error = firstError && !firstError.ok ? firstError.error : {};
    return {
      ok: false,
      error: {
        code: error.code,
        missing,
        message:
          missing.length === SOUNDCORE_SECRET_NAMES.length
            ? "No Soundcore credentials configured. Store SOUNDCORE_AUTH_TOKEN, SOUNDCORE_UID, and SOUNDCORE_OPENUDID with TinyCloud Secrets."
            : `Missing Soundcore secret${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
      },
    };
  }

  return {
    ok: true,
    data: {
      authToken: values.get(SOUNDCORE_AUTH_TOKEN_SECRET_NAME)!,
      uid: values.get(SOUNDCORE_UID_SECRET_NAME)!,
      openudid: values.get(SOUNDCORE_OPENUDID_SECRET_NAME)!,
    },
  };
}

function parseSoundcoreSessionSecret(value: string): SoundcoreCredentials | null {
  try {
    const parsed = JSON.parse(value) as Partial<SoundcoreCredentials>;
    const authToken = stringValue(parsed.authToken);
    const uid = stringValue(parsed.uid);
    const openudid = stringValue(parsed.openudid);
    if (!authToken || !uid || !openudid) return null;
    return { authToken, uid, openudid };
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

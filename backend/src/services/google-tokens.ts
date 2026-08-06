import type { DelegatedAccess } from "@listen/server";
import type { GoogleTokenResponse } from "./google-auth.js";

export const GOOGLE_MEET_TOKENS_SECRET_NAME = "GOOGLE_MEET_TOKENS";
export const GOOGLE_MEET_TOKENS_SECRET_SCOPE = "listen";
export const LEGACY_GOOGLE_TOKENS_PATH = "config/google-tokens";

export interface StoredGoogleTokens extends GoogleTokenResponse {
  googleUserId?: string;
}

interface SecretAccess {
  get(name: string, options?: { scope?: string }): Promise<any>;
  put?(name: string, value: string, options?: { scope?: string }): Promise<any>;
  delete?(name: string, options?: { scope?: string }): Promise<any>;
}

type GoogleTokenAccess = DelegatedAccess & {
  secrets?: SecretAccess;
};

export class GoogleTokenReadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GoogleTokenReadError";
    this.code = code;
  }
}

function kvData(result: any): unknown | null {
  return result?.ok === true ? (result.data?.data ?? null) : null;
}

function missingSecret(result: any): boolean {
  const code = result?.error?.code?.toLowerCase();
  return code === "key_not_found" || code === "not_found" || code === "kv_not_found";
}

function parseTokens(raw: unknown): StoredGoogleTokens | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof (parsed as { access_token?: unknown }).access_token === "string" &&
      (parsed as { access_token: string }).access_token !== ""
      ? (parsed as StoredGoogleTokens)
      : null;
  } catch {
    return null;
  }
}

export type GoogleTokenReadResult =
  | { ok: true; data: StoredGoogleTokens }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "operational"; error: GoogleTokenReadError };

export async function readGoogleTokensResult(
  access: GoogleTokenAccess,
): Promise<GoogleTokenReadResult> {
  if (access.secrets?.get) {
    let result: any;
    try {
      result = await access.secrets.get(GOOGLE_MEET_TOKENS_SECRET_NAME, {
        scope: GOOGLE_MEET_TOKENS_SECRET_SCOPE,
      });
    } catch (error) {
      return { ok: false, reason: "operational", error: asGoogleTokenReadError(error) };
    }
    if (result?.ok === true) {
      const tokens = parseTokens(result.data);
      return tokens
        ? { ok: true, data: tokens }
        : {
            ok: false,
            reason: "operational",
            error: new GoogleTokenReadError(
              "invalid_google_tokens",
              "Stored Google tokens are malformed",
            ),
          };
    }
    if (!missingSecret(result)) {
      return { ok: false, reason: "operational", error: googleTokenResultError(result) };
    }
  }

  let legacy: any;
  try {
    legacy = await access.kv.get(LEGACY_GOOGLE_TOKENS_PATH);
  } catch (error) {
    return { ok: false, reason: "operational", error: asGoogleTokenReadError(error) };
  }
  if (legacy?.ok !== true) {
    if (missingLegacySecret(legacy)) return { ok: false, reason: "missing" };
    return { ok: false, reason: "operational", error: googleTokenResultError(legacy) };
  }

  const tokens = parseTokens(kvData(legacy));
  return tokens
    ? { ok: true, data: tokens }
    : {
        ok: false,
        reason: "operational",
        error: new GoogleTokenReadError(
          "invalid_google_tokens",
          "Stored Google tokens are malformed",
        ),
      };
}

export async function readGoogleTokens(
  access: GoogleTokenAccess,
): Promise<StoredGoogleTokens | null> {
  const result = await readGoogleTokensResult(access);
  if (result.ok) return result.data;
  if (result.reason === "missing") return null;
  throw result.error;
}

export async function googleTokensExist(access: GoogleTokenAccess): Promise<boolean> {
  const result = await readGoogleTokensResult(access);
  if (result.ok) return true;
  if (result.reason === "missing") return false;
  throw result.error;
}

function missingLegacySecret(result: any): boolean {
  const code = result?.error?.code?.toLowerCase();
  return code === "key_not_found" || code === "not_found" || code === "kv_not_found";
}

function googleTokenResultError(result: any): GoogleTokenReadError {
  const code =
    typeof result?.error?.code === "string" ? result.error.code : "google_token_read_failed";
  const message =
    typeof result?.error?.message === "string"
      ? result.error.message
      : "Failed to read Google tokens";
  return new GoogleTokenReadError(code, message);
}

function asGoogleTokenReadError(error: unknown): GoogleTokenReadError {
  if (error instanceof GoogleTokenReadError) return error;
  return new GoogleTokenReadError(
    typeof (error as { code?: unknown })?.code === "string"
      ? (error as { code: string }).code
      : "google_token_read_failed",
    error instanceof Error ? error.message : String(error),
  );
}

export async function writeGoogleTokens(
  access: GoogleTokenAccess,
  tokens: StoredGoogleTokens,
): Promise<void> {
  const serialized = JSON.stringify(tokens);
  if (access.secrets?.put) {
    const result = await access.secrets.put(GOOGLE_MEET_TOKENS_SECRET_NAME, serialized, {
      scope: GOOGLE_MEET_TOKENS_SECRET_SCOPE,
    });
    if (!result?.ok) {
      throw new Error(
        result?.error?.message ?? "Failed to store Google tokens in TinyCloud Secrets",
      );
    }
    return;
  }

  const result = await access.kv.put(LEGACY_GOOGLE_TOKENS_PATH, serialized);
  if (!result?.ok) {
    throw new Error(result?.error?.message ?? "Failed to store Google tokens");
  }
}

export async function deleteGoogleTokens(access: GoogleTokenAccess): Promise<void> {
  if (access.secrets?.delete) {
    const result = await access.secrets.delete(GOOGLE_MEET_TOKENS_SECRET_NAME, {
      scope: GOOGLE_MEET_TOKENS_SECRET_SCOPE,
    });
    if (!result?.ok && !missingSecret(result)) {
      throw new Error(
        result?.error?.message ?? "Failed to delete Google tokens from TinyCloud Secrets",
      );
    }
  }

  const legacy = await access.kv.delete(LEGACY_GOOGLE_TOKENS_PATH);
  if (!legacy?.ok && legacy?.error?.code !== "KV_NOT_FOUND") {
    throw new Error(legacy?.error?.message ?? "Failed to delete legacy Google tokens");
  }
}

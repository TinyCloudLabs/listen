import type { DelegatedAccess } from "@listen/server";
import type { GoogleTokenResponse } from "./google-auth.js";

export const GOOGLE_MEET_TOKENS_SECRET_NAME = "GOOGLE_MEET_TOKENS";
export const LEGACY_GOOGLE_TOKENS_PATH = "config/google-tokens";

export interface StoredGoogleTokens extends GoogleTokenResponse {
  googleUserId?: string;
}

interface SecretAccess {
  get(name: string): Promise<any>;
  put?(name: string, value: string): Promise<any>;
  delete?(name: string): Promise<any>;
}

type GoogleTokenAccess = DelegatedAccess & {
  secrets?: SecretAccess;
};

function kvData(result: any): unknown | null {
  return result?.ok ? (result.data?.data ?? null) : null;
}

function missingSecret(result: any): boolean {
  const code = result?.error?.code?.toLowerCase();
  return code === "key_not_found" || code === "not_found" || code === "kv_not_found";
}

function parseTokens(raw: unknown): StoredGoogleTokens | null {
  try {
    if (typeof raw === "object" && raw !== null && !(raw instanceof Uint8Array)) {
      return raw as StoredGoogleTokens;
    }
    const str = raw instanceof Uint8Array ? new TextDecoder().decode(raw) : String(raw);
    return JSON.parse(str) as StoredGoogleTokens;
  } catch {
    return null;
  }
}

export async function readGoogleTokens(
  access: GoogleTokenAccess,
): Promise<StoredGoogleTokens | null> {
  if (access.secrets?.get) {
    const result = await access.secrets.get(GOOGLE_MEET_TOKENS_SECRET_NAME);
    if (result?.ok) return parseTokens(result.data);
    if (!missingSecret(result)) return null;
  }

  const legacy = await access.kv.get(LEGACY_GOOGLE_TOKENS_PATH);
  return parseTokens(kvData(legacy));
}

export async function googleTokensExist(access: GoogleTokenAccess): Promise<boolean | null> {
  if (access.secrets?.get) {
    const result = await access.secrets.get(GOOGLE_MEET_TOKENS_SECRET_NAME);
    if (result?.ok) return Boolean(result.data);
    if (!missingSecret(result)) return null;
  }

  const legacy = await access.kv.get(LEGACY_GOOGLE_TOKENS_PATH);
  if (!legacy.ok && legacy.error?.code !== "KV_NOT_FOUND") return null;
  return kvData(legacy) != null;
}

export async function writeGoogleTokens(
  access: GoogleTokenAccess,
  tokens: StoredGoogleTokens,
): Promise<void> {
  const serialized = JSON.stringify(tokens);
  if (access.secrets?.put) {
    const result = await access.secrets.put(GOOGLE_MEET_TOKENS_SECRET_NAME, serialized);
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
    const result = await access.secrets.delete(GOOGLE_MEET_TOKENS_SECRET_NAME);
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

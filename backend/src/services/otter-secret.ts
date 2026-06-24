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

interface SecretAccess {
  get(name: string, options?: { scope?: string }): Promise<any>;
  put?(name: string, value: string, options?: { scope?: string }): Promise<any>;
  delete?(name: string, options?: { scope?: string }): Promise<any>;
}

type OtterSecretAccess = (DelegatedAccess & { secrets?: SecretAccess }) | undefined;

function parseCookie(raw: unknown): OtterCookie | null {
  try {
    const value =
      typeof raw === "object" && raw !== null && !(raw instanceof Uint8Array)
        ? (raw as Record<string, unknown>)
        : JSON.parse(raw instanceof Uint8Array ? new TextDecoder().decode(raw) : String(raw));
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

export async function readOtterCookie(access: OtterSecretAccess): Promise<OtterCookie | null> {
  if (!access?.secrets?.get) return null;
  const result = await access.secrets.get(OTTER_COOKIE_SECRET_NAME, {
    scope: OTTER_COOKIE_SECRET_SCOPE,
  });
  return result?.ok ? parseCookie(result.data) : null;
}

export async function otterCookieExists(access: OtterSecretAccess): Promise<boolean> {
  return (await readOtterCookie(access)) != null;
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
  if (!access?.secrets?.delete) return;
  const result = await access.secrets.delete(OTTER_COOKIE_SECRET_NAME, {
    scope: OTTER_COOKIE_SECRET_SCOPE,
  });
  if (!result?.ok && result?.error?.code?.toLowerCase() !== "key_not_found") {
    throw new Error(
      result?.error?.message ?? "Failed to delete Otter cookie from TinyCloud Secrets",
    );
  }
}

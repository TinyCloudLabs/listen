import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

export interface OtterCookie {
  sessionid: string;
  csrftoken: string;
}

/** Resolve the Otter cookie: explicit > env (OTTER_SESSIONID/OTTER_CSRFTOKEN) > stored file. */
export function resolveCookie(cookiePath: string, explicit?: Partial<OtterCookie>): OtterCookie {
  const sessionid =
    explicit?.sessionid ?? process.env.OTTER_SESSIONID ?? storedField(cookiePath, "sessionid");
  const csrftoken =
    explicit?.csrftoken ?? process.env.OTTER_CSRFTOKEN ?? storedField(cookiePath, "csrftoken");
  if (!sessionid || !csrftoken) {
    throw new Error(
      "No Otter cookie. Run `otter-importer cookie --sessionid <s> --csrftoken <c>`, " +
        "set OTTER_SESSIONID/OTTER_CSRFTOKEN, or use scripts/dump_cookie.py.",
    );
  }
  return { sessionid, csrftoken };
}

export function storeCookie(cookiePath: string, cookie: OtterCookie): void {
  writeFileSync(cookiePath, `${JSON.stringify(cookie, null, 2)}\n`);
  chmodSync(cookiePath, 0o600);
}

function storedField(cookiePath: string, field: keyof OtterCookie): string | undefined {
  if (!existsSync(cookiePath)) return undefined;
  const parsed = JSON.parse(readFileSync(cookiePath, "utf8")) as Partial<OtterCookie>;
  return parsed[field];
}

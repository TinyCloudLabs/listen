import type { DelegatedAccess } from "@listen/server";

interface DelegatedSecrets {
  get(
    name: string,
    options?: { scope?: string },
  ): Promise<{
    ok: boolean;
    data?: string;
    error?: { code?: string; message?: string };
  }>;
  put?(
    name: string,
    value: string,
    options?: { scope?: string },
  ): Promise<{
    ok: boolean;
    error?: { code?: string; message?: string };
  }>;
  delete?(
    name: string,
    options?: { scope?: string },
  ): Promise<{
    ok: boolean;
    error?: { code?: string; message?: string };
  }>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Authenticated user from session token verification */
      user?: {
        address: string;
      };
      /** Activated delegation for the authenticated user */
      delegatedAccess?: DelegatedAccess & { secrets?: DelegatedSecrets };
    }
  }
}

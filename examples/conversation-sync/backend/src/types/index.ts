import type { DelegatedAccess } from "@tinyboilerplate/server";

interface DelegatedSecrets {
  get(name: string): Promise<{
    ok: boolean;
    data?: string;
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

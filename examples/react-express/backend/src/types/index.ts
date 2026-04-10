import type { DelegatedAccess } from "@tinyboilerplate/server";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Authenticated user from session token verification */
      user?: {
        address: string;
      };
      /** Activated delegation for the authenticated user */
      delegatedAccess?: DelegatedAccess;
    }
  }
}

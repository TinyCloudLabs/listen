import type { DelegatedAccess } from "@tinyboilerplate/server";

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user from JWT verification */
      user?: {
        sub: string;
      };
      /** Activated delegation for the authenticated user */
      delegatedAccess?: DelegatedAccess;
    }
  }
}

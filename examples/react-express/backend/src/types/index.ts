import type { DelegatedAccess } from "@tinyboilerplate/server";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        address: string;
      };
      delegatedAccess?: DelegatedAccess;
    }
  }
}

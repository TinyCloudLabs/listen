import { Router } from "express";
import type { Request, Response } from "express";
import type { NonceStore } from "@tinyboilerplate/server";
import { verifySIWE, issueSessionToken } from "@tinyboilerplate/server";

// ── Types ────────────────────────────────────────────────────────────

interface AuthRoutesConfig {
  nonceStore: NonceStore;
  privateKey: string;
}

// ── Auth Routes ─────────────────────────────────────────────────────

export function createAuthRouter(config: AuthRoutesConfig) {
  const { nonceStore, privateKey } = config;
  const router = Router();

  // ── GET /api/auth/nonce — generate a nonce for SIWE ────────────
  router.get("/nonce", (req: Request, res: Response) => {
    const address = req.query.address as string;

    if (!address || typeof address !== "string") {
      res.status(400).json({
        error: "invalid_request",
        message: "Query parameter 'address' is required",
      });
      return;
    }

    // Basic Ethereum address validation
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      res.status(400).json({
        error: "invalid_address",
        message: "Invalid Ethereum address format",
      });
      return;
    }

    const nonce = nonceStore.generate(address);
    res.json({ nonce });
  });

  // ── POST /api/auth/verify — verify SIWE signature ─────────────
  router.post("/verify", async (req: Request, res: Response) => {
    const { message, signature } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({
        error: "invalid_request",
        message: "Request body must include a 'message' string field",
      });
      return;
    }

    if (!signature || typeof signature !== "string") {
      res.status(400).json({
        error: "invalid_request",
        message: "Request body must include a 'signature' string field",
      });
      return;
    }

    try {
      const { address, nonce } = await verifySIWE(message, signature);

      if (!nonceStore.validate(address, nonce)) {
        res.status(401).json({
          error: "invalid_nonce",
          message: "Nonce is invalid, expired, or already used",
        });
        return;
      }

      const { token, expiresIn } = await issueSessionToken(address, privateKey);

      res.json({
        token,
        expiresIn,
        address: address.toLowerCase(),
      });
    } catch (err) {
      console.error("[auth] SIWE verification failed:", err);
      res.status(401).json({
        error: "verification_failed",
        message: "SIWE signature verification failed",
      });
    }
  });

  return router;
}

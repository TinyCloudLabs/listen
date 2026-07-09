import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { OtterApiError, OtterClient } from "../services/otter-client.js";
import type { OtterCookie } from "../services/otter-secret.js";
import { readOtterCookie } from "../services/otter-secret.js";
import { runOtterSync } from "../services/otter-sync-runner.js";
import { type BackendKV, recordLastSuccessfulSync } from "../services/sync-freshness.js";

interface OtterSyncRoutesConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  backendKV?: BackendKV;
  createClient?: (cookie: OtterCookie) => OtterClient;
}

export function createOtterSyncRouter(config: OtterSyncRoutesConfig) {
  const { authMiddleware, delegationMiddleware, backendKV } = config;
  const makeClient = config.createClient ?? ((cookie: OtterCookie) => new OtterClient(cookie));
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  // GET /api/otter/sync/stream — incremental sync with Server-Sent progress.
  router.get("/stream", async (req: Request, res: Response) => {
    const access = req.delegatedAccess!;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    let aborted = false;
    req.on("close", () => {
      aborted = true;
    });
    const send = (type: string, data: unknown) => {
      if (!aborted) res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const cookie = await readOtterCookie(access);
      if (!cookie) {
        send("error", { message: "No Otter cookie configured." });
        res.end();
        return;
      }
      const mode = req.query.mode === "full" ? "full" : "incremental";
      const summary = await runOtterSync(access, makeClient(cookie), {
        mode,
        shouldContinue: () => !aborted,
        onProgress: (p) => send(p.phase === "listing" ? "status" : "progress", p),
      });
      const ownerAddress = req.user?.address;
      if (ownerAddress) await recordLastSuccessfulSync(backendKV, ownerAddress, "otter");
      send("complete", summary);
    } catch (err) {
      if (err instanceof OtterApiError && err.status === 429) {
        send("error", { code: "otter_rate_limited", message: "Otter rate-limited the sync." });
      } else {
        // generic — logs are public, don't echo upstream request details
        console.error("[otter] sync stream failed");
        send("error", { message: "Otter sync failed." });
      }
    }
    res.end();
  });

  return router;
}

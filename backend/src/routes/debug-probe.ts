import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";

interface DebugProbeConfig {
  node: TinyCloudNode;
  authMiddleware: RequestHandler;
}

interface ProbeStep {
  step: string;
  ms: number;
  ok: boolean;
  timedOut?: boolean;
  error?: string;
  detail?: unknown;
}

const STEP_BUDGET_MS = 25_000;
const ROUTE_BUDGET_MS = 50_000;

/**
 * Temporary incident diagnostics (tinycloud-node#115): times each class of
 * backend->node operation server-side so we can see which op hangs and with
 * what error, instead of inferring through the 60s ingress timeout.
 * Auth-gated; read-only apart from one probe KV key in the backend's own
 * space. Remove once the incident is closed.
 */
export function createDebugProbeRouter(config: DebugProbeConfig) {
  const { node, authMiddleware } = config;
  const router = Router();

  router.use(authMiddleware);

  router.get("/", async (req: Request, res: Response) => {
    const steps: ProbeStep[] = [];
    const routeStart = Date.now();

    const run = async (step: string, fn: () => Promise<unknown>): Promise<boolean> => {
      if (Date.now() - routeStart > ROUTE_BUDGET_MS) {
        steps.push({ step, ms: 0, ok: false, error: "route budget exhausted, skipped" });
        return false;
      }
      const start = Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          fn(),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`step timed out after ${STEP_BUDGET_MS}ms`)),
              STEP_BUDGET_MS,
            );
          }),
        ]);
        steps.push({
          step,
          ms: Date.now() - start,
          ok: true,
          detail: summarize(result),
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        steps.push({
          step,
          ms: Date.now() - start,
          ok: false,
          timedOut: message.includes("step timed out"),
          error: message,
        });
        return false;
      } finally {
        clearTimeout(timer);
      }
    };

    const address = req.user?.address ?? "unknown";

    await run("kv.get debug/probe", () => node.kv.get("debug/probe"));
    await run("kv.put debug/probe", () => node.kv.put("debug/probe", new Date().toISOString()));
    await run(`kv.get delegations/${address}`, () => node.kv.get(`delegations/${address}`));
    await run("kv.list", () => node.kv.list());
    await run("signIn", () => node.signIn());
    await run("kv.get debug/probe (post-signIn)", () => node.kv.get("debug/probe"));

    res.json({
      host: process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz",
      backendDid: node.did,
      totalMs: Date.now() - routeStart,
      steps,
    });
  });

  return router;
}

function summarize(result: unknown): unknown {
  if (result && typeof result === "object") {
    const entry = result as { ok?: unknown; error?: { code?: string; message?: string } };
    if (typeof entry.ok === "boolean") {
      return entry.ok
        ? { ok: true }
        : { ok: false, code: entry.error?.code, message: entry.error?.message };
    }
  }
  return undefined;
}

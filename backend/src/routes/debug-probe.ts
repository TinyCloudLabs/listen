import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";
import type { TinyCloudNode } from "@tinycloud/node-sdk";
import type { DelegationStore } from "@listen/server";
import {
  activatePortableDelegation,
  deserializePortableDelegationSet,
} from "../delegation-activation.js";

interface DebugProbeConfig {
  node: TinyCloudNode;
  authMiddleware: RequestHandler;
  store: DelegationStore;
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
  const { node, authMiddleware, store } = config;
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

    let stored: Awaited<ReturnType<DelegationStore["load"]>> = null;
    await run("store.load(address)", async () => {
      const loaded = await store.load(address);
      stored = loaded;
      return loaded
        ? {
            ok: true,
            code: `expiresAt=${loaded.expiresAt} grantedAt=${loaded.grantedAt}`,
            message: `serializedLen=${loaded.serialized?.length} policyHash=${loaded.policyHash}`,
          }
        : { ok: false, code: "NOT_FOUND", message: "no stored delegation" };
    });

    const active = stored as Awaited<ReturnType<DelegationStore["load"]>>;
    if (active) {
      let deserialized: ReturnType<typeof deserializePortableDelegationSet> | null = null;
      await run("deserialize stored delegation", async () => {
        deserialized = deserializePortableDelegationSet(active.serialized);
        const entries = Array.isArray(deserialized) ? deserialized : [deserialized];
        return {
          ok: true,
          code: `delegations=${entries.length}`,
          message: entries
            .map(
              (d) =>
                `cid=${String((d as { cid?: unknown }).cid).slice(0, 16)} expiry=${(d as { expiry?: Date }).expiry?.toISOString?.()}`,
            )
            .join("; "),
        };
      });
      if (deserialized) {
        const bundle = deserialized;
        await run("activatePortableDelegation", async () => {
          const access = await activatePortableDelegation(node, bundle);
          return {
            ok: true,
            code: `spaceId=${access.spaceId}`,
            message: `path=${JSON.stringify(access.path)}`,
          };
        });
      }
    }

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

import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { readCurrentFirefliesJobKV } from "./sync.js";
import { readCurrentGranolaJobKV } from "./granola-sync.js";
import { readCurrentGoogleMeetJobKV } from "./google-meet-sync.js";

// This endpoint is the single poll target for GlobalSyncIndicator; it preserves the
// per-source resume-on-poll semantics via the resume registry (restart-mid-job
// recovery, see per-source GET jobs/current handlers).

interface BackendKV {
  get(key: string): Promise<{
    ok: boolean;
    data?: { data: string | null };
    error?: { code?: string; message?: string };
  }>;
  put(
    key: string,
    value: string,
  ): Promise<{
    ok: boolean;
    error?: { code?: string; message?: string };
  }>;
}

export type SyncJobResumer = (req: Request, job: any) => Promise<any>;

export interface SyncJobResumeRegistry {
  fireflies?: SyncJobResumer;
  granola?: SyncJobResumer;
  "google-meet"?: SyncJobResumer;
}

interface SyncJobsRouterConfig {
  authMiddleware: RequestHandler;
  delegationMiddleware: RequestHandler;
  backendKV?: BackendKV;
  resumeRegistry?: SyncJobResumeRegistry;
}

function normalizeOwnerAddress(req: Request): string {
  const address = req.user?.address;
  if (!address) throw new Error("Authenticated request is missing user address");
  return address.toLowerCase();
}

export function createSyncJobsRouter(config: SyncJobsRouterConfig) {
  const { authMiddleware, delegationMiddleware, backendKV, resumeRegistry } = config;
  const router = Router();

  router.use(authMiddleware);
  router.use(delegationMiddleware);

  router.get("/", async (req: Request, res: Response) => {
    if (!backendKV) {
      res.status(503).json({
        error: "sync_jobs_unavailable",
        message: "Background sync jobs are not configured.",
      });
      return;
    }

    try {
      const ownerAddress = normalizeOwnerAddress(req);

      const readSource = async (
        key: keyof SyncJobResumeRegistry,
        readCurrentJob: (kv: BackendKV, owner: string) => Promise<any>,
      ) => {
        try {
          let job = await readCurrentJob(backendKV, ownerAddress);
          if (job) {
            const resumer = resumeRegistry?.[key];
            if (resumer) {
              try {
                job = await resumer(req, job);
              } catch (err) {
                console.warn(`[sync-jobs] ${key} resume failed`, err);
              }
            }
          }
          return job;
        } catch (err) {
          console.warn(`[sync-jobs] failed to read ${key} job`, err);
          return null;
        }
      };

      const [fireflies, granola, googleMeet] = await Promise.all([
        readSource("fireflies", readCurrentFirefliesJobKV),
        readSource("granola", readCurrentGranolaJobKV),
        process.env.GOOGLE_CLIENT_ID
          ? readSource("google-meet", readCurrentGoogleMeetJobKV)
          : Promise.resolve(null),
      ]);

      res.json({ fireflies, granola, "google-meet": googleMeet });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "sync_jobs_read_failed", message });
    }
  });

  return router;
}

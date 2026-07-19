// 180s default: activating the ~12-resource delegation bundle is serialized
// by the node's per-chain guards at ~2s per resource today
// (tinycloud-node#115 epoch-scan tax), so 30s cut activation off right at
// the boundary. The ingress still caps a single request's response at 60s,
// but the server-side activation completes and is cached, so the client's
// retry succeeds.
export const TINY_CLOUD_OPERATION_TIMEOUT_MS = parseInt(process.env.TC_TIMEOUT_MS ?? "180000", 10);

export class TinyCloudOperationTimeoutError extends Error {
  override name = "TinyCloudOperationTimeoutError";

  constructor() {
    super("TinyCloud operation timed out");
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = TINY_CLOUD_OPERATION_TIMEOUT_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TinyCloudOperationTimeoutError()), timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

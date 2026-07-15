// 90s default: activating the ~12-resource delegation bundle is serialized
// by the node's per-chain guards at ~2s per resource today
// (tinycloud-node#115 epoch-scan tax), so 30s cut activation off right at
// the boundary. The ingress still caps a single request's response at 60s,
// but the server-side activation completes and is cached, so the client's
// retry succeeds.
const TC_TIMEOUT_MS = parseInt(process.env.TC_TIMEOUT_MS ?? "90000", 10);

export function withTimeout<T>(promise: Promise<T>, timeoutMs = TC_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TinyCloud operation timed out")), timeoutMs);
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

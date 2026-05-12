const TC_TIMEOUT_MS = parseInt(process.env.TC_TIMEOUT_MS ?? "30000", 10);

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

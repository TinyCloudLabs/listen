import type { RateLimitExceededEventHandler, RateLimitInfo } from "express-rate-limit";

type RequestWithRateLimit = Parameters<RateLimitExceededEventHandler>[0] & {
  rateLimit?: RateLimitInfo;
};

export default function rateLimitHandler(message: string): RateLimitExceededEventHandler {
  return (req, res, _next, options) => {
    const resetTime = (req as RequestWithRateLimit).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil(options.windowMs / 1000);

    res.set("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "rate_limited", message });
  };
}

export const LOCAL_FRONTEND_ORIGINS = [
  "https://listen.localhost",
  "https://listen.localhost:1355",
  "https://localhost:5173",
  "http://localhost:5173",
] as const;

export function computeFrontendOrigins(frontendUrl: string, isProduction: boolean): Set<string> {
  return new Set([
    ...frontendUrl
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...(isProduction ? [] : LOCAL_FRONTEND_ORIGINS),
  ]);
}

export function computeAllowedSiweDomains(origins: Iterable<string>): ReadonlySet<string> {
  return new Set(
    [...origins].flatMap((origin) => {
      const url = new URL(origin);
      return [url.hostname, url.host];
    }),
  );
}

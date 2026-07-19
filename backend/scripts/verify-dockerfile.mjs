import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dockerfile = readFileSync(resolve(import.meta.dirname, "../Dockerfile"), "utf8");
const runtime = dockerfile.slice(dockerfile.indexOf("FROM oven/bun:1.3.9 AS runtime"));

const required = [
  "FROM oven/bun:1.3.9 AS build",
  "FROM oven/bun:1.3.9 AS runtime",
  "RUN bun install --frozen-lockfile",
  "bun install --production --frozen-lockfile --filter=listen-backend",
  "COPY --from=build /app/node_modules ./node_modules",
  "COPY --from=build /app/packages/core/dist ./packages/core/dist",
  "COPY --from=build /app/packages/server/dist ./packages/server/dist",
  "COPY --from=build /app/runtime/backend ./backend",
  "COPY --from=build /app/backend/node_modules ./backend/node_modules",
  "COPY --from=build /app/packages/server/node_modules ./packages/server/node_modules",
  'CMD ["bun", "run", "start"]',
];

for (const fragment of required) {
  if (!dockerfile.includes(fragment)) {
    throw new Error(`Dockerfile is missing required production-build fragment: ${fragment}`);
  }
}

const fullInstallRemoval = dockerfile.indexOf("RUN rm -rf /app/node_modules");
const productionInstall = dockerfile.indexOf(
  "bun install --production --frozen-lockfile --filter=listen-backend",
);
if (fullInstallRemoval < 0 || fullInstallRemoval > productionInstall) {
  throw new Error("The full build dependency tree must be removed before production install");
}

for (const forbidden of ["COPY test", "COPY frontend", "COPY vendor", "COPY frontend/vendor"]) {
  if (runtime.includes(forbidden)) {
    throw new Error(`Runtime stage must not copy ${forbidden.replace("COPY ", "")}`);
  }
}

if (!runtime.includes("test ! -e /app/test") || !runtime.includes("test ! -e /app/frontend")) {
  throw new Error("Runtime stage must assert test/ and frontend/ are absent");
}

if (!runtime.includes("find /app -name '*-m1*'")) {
  throw new Error("Runtime stage must reject legacy -m1 artifacts");
}

console.log("backend Dockerfile production isolation checks passed");

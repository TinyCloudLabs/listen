# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9 AS build
WORKDIR /app

ENV HUSKY=0

COPY package.json bun.lock tsconfig.base.json turbo.json ./
COPY manifest.json ./
COPY packages ./packages
COPY backend ./backend
COPY frontend/package.json ./frontend/package.json
COPY test/package.json ./test/package.json
COPY test/vendor ./test/vendor

RUN bun install --frozen-lockfile
RUN bun run --cwd packages/core build
RUN bun run --cwd packages/server build
RUN bun run --cwd backend build

# Keep the full install available for compilation, then reduce the copied
# dependency tree to the backend's production workspace closure.
RUN rm -rf /app/node_modules /app/backend/node_modules /app/packages/core/node_modules \
  /app/packages/server/node_modules /app/frontend/node_modules /app/test/node_modules \
  && bun install --production --frozen-lockfile --filter=listen-backend
RUN mkdir -p /app/runtime/backend \
  && cp -R /app/backend/src /app/backend/package.json /app/backend/openapi.yaml /app/runtime/backend/ \
  && rm -rf /app/runtime/backend/src/__tests__

FROM oven/bun:1.3.9 AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/manifest.json ./manifest.json
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/server/package.json ./packages/server/package.json
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/runtime/backend ./backend
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/packages/server/node_modules ./packages/server/node_modules

# The runtime boundary must stay independent of the test/frontend workspace.
RUN test ! -e /app/test \
  && test ! -e /app/frontend \
  && test ! -e /app/vendor \
  && test ! -e /app/frontend/vendor \
  && if find /app -name '*-m1*' -print -quit | grep -q .; then \
       echo 'forbidden -m1 artifact in backend runtime image' >&2; \
       exit 1; \
     fi

WORKDIR /app/backend
EXPOSE 3001

CMD ["bun", "run", "start"]

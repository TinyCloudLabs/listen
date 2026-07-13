# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9 AS app
WORKDIR /app

ENV HUSKY=0

COPY package.json tsconfig.base.json turbo.json ./
COPY manifest.json ./
COPY packages ./packages
COPY backend ./backend
COPY frontend/package.json ./frontend/package.json
COPY frontend/vendor/tinycloud-sdk-core-m1 ./frontend/vendor/tinycloud-sdk-core-m1
COPY test/package.json ./test/package.json
COPY test/vendor/tinycloud-node-sdk-m1 ./test/vendor/tinycloud-node-sdk-m1

RUN bun install
RUN cd packages/core && bun run build
RUN cd packages/server && bun run build
RUN cd backend && bun run build

WORKDIR /app/backend
EXPOSE 3001

CMD ["bun", "run", "start"]

# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.9 AS app
WORKDIR /app

ENV HUSKY=0

COPY package.json tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY backend ./backend
COPY frontend/package.json ./frontend/package.json

RUN bun install
RUN cd packages/core && bun run build
RUN cd packages/server && bun run build
RUN cd backend && bun run build

WORKDIR /app/backend
EXPOSE 3001

CMD ["bun", "run", "start"]

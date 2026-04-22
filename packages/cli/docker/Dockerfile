# syntax=docker/dockerfile:1.7
# ---------- builder: compile listen + delegation-endpoint to standalone binaries ----------
# We detect the arch inside the container (uname -m) rather than relying on
# buildkit's $TARGETARCH, which is only populated when --platform is explicit.
# This compiles native for the host arch so the image runs without Rosetta/qemu.
FROM oven/bun:1.3 AS builder
WORKDIR /build

# Copy just what we need to bun-install + bun-build the cli package.
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/cli packages/cli
# Needed for @tinyboilerplate/cli's postinstall (fix-wasm-esm.mjs lives here).
COPY packages/server/scripts packages/server/scripts
# Minimal server/client package.json stubs so bun install's workspace scan doesn't error.
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

# Trim the root workspaces list to only the packages we actually COPYed in —
# the example frontend/backend dirs aren't present in this build context.
RUN bun -e "const f=require('fs'); const p=JSON.parse(f.readFileSync('package.json')); p.workspaces=['packages/core','packages/cli','packages/server','packages/client']; f.writeFileSync('package.json', JSON.stringify(p, null, 2));"

# husky "prepare" script must be neutralized in CI/Docker.
ENV HUSKY=0

RUN bun install

# Compile both binaries. Target matches the container's arch (host-native).
RUN set -eu; \
    case "$(uname -m)" in \
      x86_64)  BUN_TARGET=bun-linux-x64 ;; \
      aarch64) BUN_TARGET=bun-linux-arm64 ;; \
      *) echo "Unsupported arch: $(uname -m)" >&2 && exit 1 ;; \
    esac; \
    bun build packages/cli/src/index.ts --compile --target=$BUN_TARGET --outfile /out/listen; \
    bun build packages/cli/docker/delegation-endpoint.ts --compile --target=$BUN_TARGET --outfile /out/delegation-endpoint

# The @tinycloud/node-sdk-wasm package loads its .wasm via an absolute path
# computed at build time (__dirname-based). `bun build --compile` bakes that
# path into the binary but doesn't embed the .wasm file itself — so at runtime
# the binary tries to read the wasm from /build/node_modules/... which doesn't
# exist in the stripped-down runtime stage. Mirror just the wasm files to the
# same path in the runtime image.
RUN mkdir -p /out/wasm && \
    find /build/node_modules -name "*.wasm" -path "*node-sdk-wasm*" -exec cp {} /out/wasm/ \;

# ---------- runtime: ubuntu + Node + opencode-ai + our binaries ----------
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates curl gnupg jq \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && npm i -g opencode-ai@latest \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Compiled binaries.
COPY --from=builder /out/listen /usr/local/bin/listen
COPY --from=builder /out/delegation-endpoint /usr/local/bin/delegation-endpoint
RUN chmod +x /usr/local/bin/listen /usr/local/bin/delegation-endpoint

# Mirror the WASM file at the exact absolute path the binary expects.
# See the builder stage comment for why.
COPY --from=builder /out/wasm/tinycloud_web_sdk_rs_bg.wasm \
     /build/node_modules/.bun/@tinycloud+node-sdk-wasm@1.7.2-beta.0/node_modules/@tinycloud/node-sdk-wasm/dist/wasm/tinycloud_web_sdk_rs_bg.wasm

# Static config + entrypoint.
COPY packages/cli/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
COPY packages/cli/docker/opencode.json /root/.config/opencode/opencode.json
COPY packages/cli/docker/CLAUDE.md /workspace/CLAUDE.md

# Per-user state (agent key + delegation). Mount a named volume here in production.
VOLUME ["/root/.listen"]

WORKDIR /workspace

EXPOSE 4096 4097

ENV TINYCLOUD_HOST=https://node.tinycloud.xyz \
    LISTEN_AGENT_KEY_PATH=/root/.listen/agent-key.json \
    LISTEN_DELEGATION_PATH=/root/.listen/delegation.txt

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

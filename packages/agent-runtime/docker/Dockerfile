# syntax=docker/dockerfile:1.7
# ---------- builder: compile the activation sidecar to a standalone binary ----------
# We detect the arch inside the container (uname -m) rather than relying on
# buildkit's $TARGETARCH, which is only populated when --platform is explicit.
# This compiles native for the host arch so the image runs without Rosetta/qemu.
FROM oven/bun:1.3 AS builder
WORKDIR /build

# Copy just what we need to bun-install + bun-build the cli package.
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/agent-runtime packages/agent-runtime
# Needed for @tinyboilerplate/cli's postinstall (fix-wasm-esm.mjs lives here).
COPY packages/server/scripts packages/server/scripts
# Minimal server/client package.json stubs so bun install's workspace scan doesn't error.
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

# Trim the root workspaces list to only the packages we actually COPYed in —
# the example frontend/backend dirs aren't present in this build context.
RUN bun -e "const f=require('fs'); const p=JSON.parse(f.readFileSync('package.json')); p.workspaces=['packages/core','packages/agent-runtime','packages/server','packages/client']; f.writeFileSync('package.json', JSON.stringify(p, null, 2));"

# husky "prepare" script must be neutralized in CI/Docker.
ENV HUSKY=0

RUN bun install

# Compile just the sidecar. Target matches the container's arch (host-native).
RUN set -eu; \
    case "$(uname -m)" in \
      x86_64)  BUN_TARGET=bun-linux-x64 ;; \
      aarch64) BUN_TARGET=bun-linux-arm64 ;; \
      *) echo "Unsupported arch: $(uname -m)" >&2 && exit 1 ;; \
    esac; \
    bun build packages/agent-runtime/docker/delegation-endpoint.ts --compile --target=$BUN_TARGET --outfile /out/delegation-endpoint

# The @tinycloud/node-sdk-wasm package loads its .wasm via an absolute path
# computed at build time (__dirname-based). `bun build --compile` bakes that
# path into the binary but doesn't embed the .wasm file itself — so at runtime
# the binary tries to read the wasm from /build/node_modules/... which doesn't
# exist in the stripped-down runtime stage. Mirror just the wasm files to the
# same path in the runtime image.
RUN mkdir -p /out/wasm && \
    find /build/node_modules -name "*.wasm" -path "*node-sdk-wasm*" -exec cp {} /out/wasm/ \;

# ---------- runtime: ubuntu + Node + opencode + tc ----------
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates curl gnupg jq \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && npm i -g opencode-ai@latest @tinycloud/cli@0.4.6 bun \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Compiled sidecar binary.
COPY --from=builder /out/delegation-endpoint /usr/local/bin/delegation-endpoint
RUN chmod +x /usr/local/bin/delegation-endpoint

# Mirror the WASM file at the exact absolute path the sidecar binary expects.
# See the builder stage comment for why.
COPY --from=builder /out/wasm/tinycloud_web_sdk_rs_bg.wasm \
     /build/node_modules/.bun/@tinycloud+node-sdk-wasm@1.7.3-beta.1/node_modules/@tinycloud/node-sdk-wasm/dist/wasm/tinycloud_web_sdk_rs_bg.wasm

# Static config + entrypoint. The CLAUDE.md that teaches the agent about
# this app's schema/KV layout is app-specific — mount it at runtime via
# `-v ./agent/CLAUDE.md:/workspace/CLAUDE.md:ro` in your compose file.
COPY packages/agent-runtime/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
COPY packages/agent-runtime/docker/opencode.json /root/.config/opencode/opencode.json

# Volumes: sidecar state (agent wallet + raw delegation) and tc profile state
# (synthesized from sidecar state; technically rebuildable, but a named volume
# avoids re-activating on every container restart).
VOLUME ["/var/lib/delegation-endpoint", "/root/.tinycloud"]

WORKDIR /workspace

EXPOSE 4096 4097

ENV TINYCLOUD_HOST=https://node.tinycloud.xyz \
    DELEGATION_SIDECAR_DIR=/var/lib/delegation-endpoint \
    TC_PROFILES_ROOT=/root/.tinycloud \
    TC_PROFILE_NAME=default \
    REFRESH_INTERVAL_MS=1500000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

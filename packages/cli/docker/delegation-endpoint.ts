#!/usr/bin/env bun
/**
 * delegation-endpoint: tiny localhost HTTP server that the listen frontend
 * POSTs a serialized PortableDelegation to. Writes it to disk; the CLI
 * reads it on each invocation.
 *
 * Runs inside the listen-agent Docker container on port 4097.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PORT = Number(process.env.DELEGATION_ENDPOINT_PORT ?? 4097);
const DELEGATION_PATH = process.env.LISTEN_DELEGATION_PATH ?? "/root/.listen/delegation.txt";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "600",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/delegation" && req.method === "POST") {
      let body: { serialized?: unknown };
      try {
        body = await req.json();
      } catch {
        return json(400, { error: { code: "invalid_json", message: "Body must be JSON." } });
      }

      const serialized = body?.serialized;
      if (typeof serialized !== "string" || serialized.length === 0) {
        return json(400, {
          error: {
            code: "invalid_body",
            message: "Body must be { serialized: string } (non-empty).",
          },
        });
      }

      try {
        mkdirSync(dirname(DELEGATION_PATH), { recursive: true });
        writeFileSync(DELEGATION_PATH, serialized, "utf-8");
      } catch (err) {
        return json(500, {
          error: { code: "write_failed", message: (err as Error).message },
        });
      }

      console.log(
        `[delegation-endpoint] wrote delegation (${serialized.length} chars) to ${DELEGATION_PATH}`,
      );
      return json(200, { ok: true, bytes: serialized.length });
    }

    if (url.pathname === "/health" && req.method === "GET") {
      return json(200, { ok: true });
    }

    return json(404, { error: { code: "not_found", message: `${req.method} ${url.pathname}` } });
  },
});

console.log(`[delegation-endpoint] listening on 0.0.0.0:${PORT} -> ${DELEGATION_PATH}`);

#!/usr/bin/env bun
import { writeError, mapError } from "./lib/output.js";
import { agentInit, agentDid } from "./commands/agent.js";
import { kvList, kvGet, kvPut, kvDel } from "./commands/kv.js";
import { sqlQuery, sqlExecute } from "./commands/sql.js";
import { doctor } from "./commands/doctor.js";

const USAGE = `listen — TinyCloud CLI bridge

Usage:
  listen agent init
  listen agent did
  listen kv list [--prefix <p>]
  listen kv get <key> [--raw]
  listen kv put <key> <value>           (value via arg or stdin)
  listen kv del <key>
  listen sql query "<sql>" [--param <p>]...
  listen sql execute "<sql>" [--param <p>]...
  listen doctor

Env:
  TINYCLOUD_HOST            (default https://node.tinycloud.xyz)
  LISTEN_AGENT_KEY_PATH     (default /root/.listen/agent-key.json)
  LISTEN_DELEGATION_PATH    (default /root/.listen/delegation.txt)
  LISTEN_SESSION_CACHE_PATH (default /tmp/listen-cli-session.json)
`;

async function dispatch(argv: string[]): Promise<void> {
  const [group, sub, ...rest] = argv;

  if (!group || group === "--help" || group === "-h" || group === "help") {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  switch (group) {
    case "agent":
      if (sub === "init") return agentInit();
      if (sub === "did") return agentDid();
      break;
    case "kv":
      if (sub === "list") return kvList(rest);
      if (sub === "get") return kvGet(rest);
      if (sub === "put") return kvPut(rest);
      if (sub === "del") return kvDel(rest);
      break;
    case "sql":
      if (sub === "query") return sqlQuery(rest);
      if (sub === "execute") return sqlExecute(rest);
      break;
    case "doctor":
      return doctor();
  }

  writeError(
    "invalid_args",
    `Unknown command: ${[group, sub].filter(Boolean).join(" ")}. Run 'listen --help'.`,
  );
}

dispatch(process.argv.slice(2)).catch((err) => {
  const { code, message } = mapError(err);
  writeError(code, message);
});

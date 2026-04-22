#!/usr/bin/env bun
import { writeError, mapError } from "./lib/output.js";
import { agentInit, agentDid } from "./commands/agent.js";
import { kvList, kvGet, kvPut, kvDel } from "./commands/kv.js";
import { sqlQuery, sqlExecute } from "./commands/sql.js";
import { doctor } from "./commands/doctor.js";

const USAGE = `tc-agent — TinyCloud agent CLI bridge

Usage:
  tc-agent agent init
  tc-agent agent did
  tc-agent kv list [--prefix <p>]
  tc-agent kv get <key> [--raw]
  tc-agent kv put <key> <value>           (value via arg or stdin)
  tc-agent kv del <key>
  tc-agent sql query "<sql>" [--param <p>]...
  tc-agent sql execute "<sql>" [--param <p>]...
  tc-agent doctor

Env:
  TINYCLOUD_HOST                (default https://node.tinycloud.xyz)
  TC_AGENT_PREFIX               (default tc-agent)
  TC_AGENT_KEY_PATH             (default /root/.tc-agent/agent-key.json)
  TC_AGENT_DELEGATION_PATH      (default /root/.tc-agent/delegation.txt)
  TC_AGENT_SESSION_CACHE_PATH   (default /tmp/tc-agent-session.json)
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
    `Unknown command: ${[group, sub].filter(Boolean).join(" ")}. Run 'tc-agent --help'.`,
  );
}

dispatch(process.argv.slice(2)).catch((err) => {
  const { code, message } = mapError(err);
  writeError(code, message);
});

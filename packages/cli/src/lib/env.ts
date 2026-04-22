export interface CliEnv {
  host: string;
  agentKeyPath: string;
  delegationPath: string;
  sessionCachePath: string;
}

export function readEnv(): CliEnv {
  return {
    host: process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz",
    agentKeyPath: process.env.TC_AGENT_KEY_PATH ?? "/root/.tc-agent/agent-key.json",
    delegationPath: process.env.TC_AGENT_DELEGATION_PATH ?? "/root/.tc-agent/delegation.txt",
    sessionCachePath: process.env.TC_AGENT_SESSION_CACHE_PATH ?? "/tmp/tc-agent-session.json",
  };
}

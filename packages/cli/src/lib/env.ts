export interface CliEnv {
  host: string;
  agentKeyPath: string;
  delegationPath: string;
  sessionCachePath: string;
}

export function readEnv(): CliEnv {
  return {
    host: process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz",
    agentKeyPath: process.env.LISTEN_AGENT_KEY_PATH ?? "/root/.listen/agent-key.json",
    delegationPath: process.env.LISTEN_DELEGATION_PATH ?? "/root/.listen/delegation.txt",
    sessionCachePath: process.env.LISTEN_SESSION_CACHE_PATH ?? "/tmp/listen-cli-session.json",
  };
}

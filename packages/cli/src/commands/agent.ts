import { ensureAgentKey, loadAgentKey, buildNode } from "../lib/identity.js";
import { readEnv } from "../lib/env.js";
import { writeJson, writeError } from "../lib/output.js";

export async function agentInit(): Promise<void> {
  const env = readEnv();
  const { generated } = ensureAgentKey(env.agentKeyPath);

  const key = loadAgentKey(env.agentKeyPath);
  if (!key) {
    writeError("internal", `Failed to load agent key after ensureAgentKey at ${env.agentKeyPath}`);
  }

  const node = buildNode(key.privateKey, env.host);
  await node.signIn();

  writeJson({ did: node.did, keyPath: env.agentKeyPath, generated });
}

export async function agentDid(): Promise<void> {
  const env = readEnv();
  const key = loadAgentKey(env.agentKeyPath);
  if (!key) {
    writeError(
      "no_agent_key",
      `Agent key not found at ${env.agentKeyPath}. Run: tc-agent agent init`,
    );
  }

  const node = buildNode(key.privateKey, env.host);
  await node.signIn();

  writeJson({ did: node.did });
}

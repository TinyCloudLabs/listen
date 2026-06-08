import { spawn, type ChildProcess } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MemorySessionStorage,
  PrivateKeySigner,
  TinyCloudNode,
  serializeDelegation,
  type PersistedSessionData,
} from "@tinycloud/node-sdk";
import { composeManifestWithDelegatees } from "../../packages/client/src/manifest";

interface StartedProcess {
  name: string;
  pid: number;
}

interface E2EState {
  baseURL: string;
  backendURL: string;
  tinycloudHost: string;
  address: string;
  listenSession: {
    token: string;
    expiresAt: number;
    address: string;
  };
  tinycloudSessionKey: string;
  tinycloudSession: PersistedSessionData;
  initialConversationTitle: string;
  liveConversationTitle: string;
  pids: StartedProcess[];
  tmpDir: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = resolve(__dirname, "..");
const LISTEN_ROOT = resolve(TEST_DIR, "..");
const TMP_DIR = resolve(TEST_DIR, ".tmp", "hooks-real-e2e");
const STATE_PATH = resolve(TMP_DIR, "state.json");
const LOG_DIR = resolve(TMP_DIR, "logs");

const DEFAULT_OWNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const DEFAULT_BACKEND_PRIVATE_KEY =
  "0x8b3a350cf5c34c9194ca3a545d9f2bc5b642b3ee6cca3a637f1d2d1765f37c13";
const DEFAULT_TINYCLOUD_NODE_SECRET = "dGlueWNsb3VkLWxpc3Rlbi1ob29rcy1lMmUtc3RhdGljLXNlY3JldC0zMg";

const pids: StartedProcess[] = [];

function cleanUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function findFreePort(preferred: number): Promise<number> {
  for (let port = preferred; port < preferred + 100; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error(`No free port found from ${preferred}`);
}

function canListen(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once("error", () => resolvePort(false));
    server.once("listening", () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function startProcess(
  name: string,
  command: string,
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): ChildProcess {
  mkdirSync(LOG_DIR, { recursive: true });
  const out = createWriteStream(resolve(LOG_DIR, `${name}.log`), { flags: "a" });
  const child = spawn(command, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    detached: true,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.pipe(out);
  child.stderr?.pipe(out);
  child.once("exit", (code, signal) => {
    out.write(`\n[${name}] exited code=${code ?? "null"} signal=${signal ?? "null"}\n`);
    out.end();
  });

  if (!child.pid) {
    throw new Error(`Failed to start ${name}`);
  }

  pids.push({ name, pid: child.pid });
  return child;
}

async function waitForHttp(url: string, label: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label} did not become ready at ${url}: ${detail}`);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${url} failed: ${response.status} ${body}`);
  }
  return response.json() as Promise<T>;
}

function tinycloudNodeRepo(): string {
  const configured = process.env.TINYCLOUD_NODE_REPO;
  if (configured) return configured;

  let cursor = LISTEN_ROOT;
  for (let i = 0; i < 6; i += 1) {
    const candidate = resolve(cursor, "repositories", "tinycloud-node");
    if (existsSync(resolve(candidate, "Cargo.toml"))) return candidate;
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  return resolve(LISTEN_ROOT, "..", "..", "repositories", "tinycloud-node");
}

async function startTinyCloudNode(port: number): Promise<string> {
  const configuredHost = process.env.TINYCLOUD_HOST;
  if (configuredHost && process.env.LISTEN_E2E_START_TINYCLOUD_NODE !== "true") {
    const host = cleanUrl(configuredHost);
    await waitForHttp(`${host}/version`, "TinyCloud node");
    return host;
  }

  const repo = tinycloudNodeRepo();
  if (!existsSync(resolve(repo, "Cargo.toml"))) {
    throw new Error(
      `TinyCloud node repo not found at ${repo}. Set TINYCLOUD_NODE_REPO or TINYCLOUD_HOST.`,
    );
  }

  const dataDir = resolve(TMP_DIR, "tinycloud-node");
  mkdirSync(resolve(dataDir, "blocks"), { recursive: true });
  const command =
    process.env.TINYCLOUD_NODE_COMMAND ??
    `cargo run --manifest-path "${resolve(repo, "Cargo.toml")}"`;
  const host = `http://127.0.0.1:${port}`;

  startProcess("tinycloud-node", command, {
    cwd: repo,
    env: {
      TINYCLOUD_ADDRESS: "127.0.0.1",
      TINYCLOUD_PORT: String(port),
      TINYCLOUD_CORS: "true",
      TINYCLOUD_STORAGE_DATADIR: dataDir,
      TINYCLOUD_STORAGE__DATADIR: dataDir,
      TINYCLOUD_STORAGE_DATABASE: `sqlite:${resolve(dataDir, "caps.db")}`,
      TINYCLOUD_STORAGE__DATABASE: `sqlite:${resolve(dataDir, "caps.db")}`,
      TINYCLOUD_STORAGE_BLOCKS_TYPE: "Local",
      TINYCLOUD_STORAGE__BLOCKS__TYPE: "Local",
      TINYCLOUD_STORAGE_BLOCKS_PATH: resolve(dataDir, "blocks"),
      TINYCLOUD_STORAGE__BLOCKS__PATH: resolve(dataDir, "blocks"),
      TINYCLOUD_KEYS_TYPE: "Static",
      TINYCLOUD_KEYS__TYPE: "Static",
      TINYCLOUD_KEYS_SECRET: process.env.TINYCLOUD_KEYS_SECRET ?? DEFAULT_TINYCLOUD_NODE_SECRET,
      TINYCLOUD_KEYS__SECRET: process.env.TINYCLOUD_KEYS_SECRET ?? DEFAULT_TINYCLOUD_NODE_SECRET,
    },
  });

  await waitForHttp(`${host}/version`, "TinyCloud node", 180_000);
  return host;
}

async function verifyListenSession(
  backendURL: string,
  address: string,
  siwe: string,
  signature: string,
): Promise<{ token: string; expiresIn: number; address: string }> {
  return fetchJson(`${backendURL}/api/auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "Listen",
    },
    body: JSON.stringify({ message: siwe, signature }),
  });
}

async function createOwnerSession(input: {
  backendURL: string;
  tinycloudHost: string;
  ownerPrivateKey: string;
}): Promise<{
  address: string;
  listenToken: string;
  listenExpiresIn: number;
  tinycloudSession: PersistedSessionData;
}> {
  const { backendURL, tinycloudHost, ownerPrivateKey } = input;
  const signer = new PrivateKeySigner(ownerPrivateKey);
  const address = await signer.getAddress();
  const principalDid = `did:pkh:eip155:1:${address}`;
  const [{ nonce }, serverInfo, appManifest] = await Promise.all([
    fetchJson<{ nonce: string }>(
      `${backendURL}/api/auth/nonce?address=${encodeURIComponent(address)}`,
    ),
    fetchJson<any>(`${backendURL}/api/server-info`),
    fetchJson<any>(`${backendURL}/api/manifest`),
  ]);

  const capabilityRequest = composeManifestWithDelegatees(appManifest, [serverInfo], {
    principalDid,
    decryptDelegateDid: serverInfo.did,
  });
  const sessionStorage = new MemorySessionStorage();
  const owner = new TinyCloudNode({
    signer,
    host: tinycloudHost,
    autoCreateSpace: true,
    capabilityRequest,
    sessionStorage,
  });

  await owner.signIn({ nonce });
  const session = owner.session;
  if (!session?.siwe || !session.signature) {
    throw new Error("TinyCloud sign-in did not produce SIWE session data");
  }

  const verified = await verifyListenSession(backendURL, address, session.siwe, session.signature);
  const persisted = await sessionStorage.load(address);
  if (!persisted) {
    throw new Error("TinyCloud sign-in did not persist a browser-restorable session");
  }

  const target = capabilityRequest.delegationTargets.find(
    (delegatee) => delegatee.did === serverInfo.did,
  );
  if (!target) {
    throw new Error(`No backend delegation target found for ${serverInfo.did}`);
  }

  const serialized = await materializeBackendDelegation(owner, target);
  await fetchJson(`${backendURL}/api/delegations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${verified.token}`,
      "Content-Type": "application/json",
      "X-Requested-With": "Listen",
    },
    body: JSON.stringify({ serialized }),
  });

  return {
    address,
    listenToken: verified.token,
    listenExpiresIn: verified.expiresIn,
    tinycloudSession: persisted,
  };
}

async function materializeBackendDelegation(
  owner: TinyCloudNode,
  target: {
    did: string;
    expiryMs?: number;
    permissions: readonly any[];
  },
): Promise<string> {
  const groups = new Map<string, any[]>();
  for (const permission of target.permissions) {
    const key = permission.space ?? "";
    groups.set(key, [...(groups.get(key) ?? []), permission]);
  }

  const delegations = [];
  for (const permissions of groups.values()) {
    const result = await owner.delegateTo(target.did, permissions, { expiry: target.expiryMs });
    delegations.push(result.delegation);
  }

  if (delegations.length === 1) {
    return serializeDelegation(delegations[0]);
  }

  return JSON.stringify({
    format: "listen.delegation-bundle",
    version: 1,
    delegations: delegations.map((delegation) => serializeDelegation(delegation)),
  });
}

async function importTranscript(backendURL: string, token: string, title: string): Promise<string> {
  const result = await fetchJson<{ conversationId: string }>(
    `${backendURL}/api/conversations/import`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Requested-With": "Listen",
      },
      body: JSON.stringify({
        title,
        transcriptText: "[00:00] Sam: Hooks are wired\n[00:03] Alex: The inbox should refresh",
        startedAt: new Date().toISOString(),
        participants: "Sam, Alex",
        summary: "Hooks E2E fixture conversation.",
      }),
    },
  );

  return result.conversationId;
}

export default async function globalSetup(): Promise<void> {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(LOG_DIR, { recursive: true });

  const tinycloudPort = Number(process.env.LISTEN_E2E_TINYCLOUD_PORT) || (await findFreePort(8787));
  const backendPort = Number(process.env.LISTEN_E2E_BACKEND_PORT) || (await findFreePort(3181));
  const frontendPort = Number(process.env.LISTEN_E2E_FRONTEND_PORT) || (await findFreePort(5183));

  const baseURL = cleanUrl(
    process.env.LISTEN_E2E_FRONTEND_URL ?? `http://127.0.0.1:${frontendPort}`,
  );
  const backendURL = cleanUrl(
    process.env.LISTEN_E2E_BACKEND_URL ?? `http://127.0.0.1:${backendPort}`,
  );
  const tinycloudHost = await startTinyCloudNode(tinycloudPort);
  const backendPrivateKey = process.env.BACKEND_PRIVATE_KEY ?? DEFAULT_BACKEND_PRIVATE_KEY;

  startProcess("listen-backend", "bun src/index.ts", {
    cwd: resolve(LISTEN_ROOT, "backend"),
    env: {
      BACKEND_PRIVATE_KEY: backendPrivateKey,
      TINYCLOUD_HOST: tinycloudHost,
      FRONTEND_URL: baseURL,
      PORT: String(backendPort),
    },
  });
  await waitForHttp(`${backendURL}/healthz`, "Listen backend");

  const owner = await createOwnerSession({
    backendURL,
    tinycloudHost,
    ownerPrivateKey: process.env.LISTEN_E2E_OWNER_PRIVATE_KEY ?? DEFAULT_OWNER_PRIVATE_KEY,
  });

  const initialConversationTitle = `Hooks E2E initial ${Date.now()}`;
  const liveConversationTitle = `Hooks E2E live ${Date.now()}`;
  await importTranscript(backendURL, owner.listenToken, initialConversationTitle);

  startProcess("listen-frontend", `bun run dev -- --host 127.0.0.1 --port ${frontendPort}`, {
    cwd: resolve(LISTEN_ROOT, "frontend"),
    env: {
      VITE_BACKEND_URL: backendURL,
      VITE_TINYCLOUD_HOST: tinycloudHost,
      VITE_ENABLE_TINYCLOUD_HOOKS: "true",
      VITE_ENABLE_AGENT: "false",
    },
  });
  await waitForHttp(baseURL, "Listen frontend");

  const state: E2EState = {
    baseURL,
    backendURL,
    tinycloudHost,
    address: owner.address,
    listenSession: {
      token: owner.listenToken,
      expiresAt: Date.now() + owner.listenExpiresIn * 1000,
      address: owner.address,
    },
    tinycloudSessionKey: `tinycloud:session:${owner.address.toLowerCase()}`,
    tinycloudSession: owner.tinycloudSession,
    initialConversationTitle,
    liveConversationTitle,
    pids,
    tmpDir: TMP_DIR,
  };

  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  writeFileSync(resolve(TMP_DIR, "pids.json"), JSON.stringify(pids, null, 2));

  // Surface the state location in the setup log for local debugging.
  writeFileSync(
    resolve(LOG_DIR, "setup.log"),
    `${JSON.stringify({ STATE_PATH, baseURL, backendURL, tinycloudHost }, null, 2)}\n`,
  );

  // Touch-read the state to catch accidental non-serializable data before tests start.
  JSON.parse(readFileSync(STATE_PATH, "utf-8"));
}

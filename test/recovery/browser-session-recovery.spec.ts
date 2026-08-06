import { expect, test, type Page } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface StartedProcess {
  name: string;
  pid: number;
}

interface RecoveryState {
  baseURL: string;
  backendURL: string;
  tinycloudHost: string;
  address: string;
  pids: StartedProcess[];
  tmpDir: string;
  tinycloudDataDir: string;
  tinycloudRepo: string;
  tinycloudPort: number;
}

const STATE_PATH = fileURLToPath(
  new URL("../.tmp/browser-recovery-e2e/state.json", import.meta.url),
);
const PID_PATH = fileURLToPath(new URL("../.tmp/browser-recovery-e2e/pids.json", import.meta.url));
const ETHERS_UMD_PATH = fileURLToPath(
  new URL("../../node_modules/ethers/dist/ethers.umd.min.js", import.meta.url),
);
const DELETE_ROOT_SCRIPT = fileURLToPath(new URL("./delete-root-delegation.ts", import.meta.url));
const TEST_WALLET_NAME = "TinyCloud Listen Test Wallet";
const DEFAULT_TINYCLOUD_NODE_SECRET = "dGlueWNsb3VkLWxpc3Rlbi1ob29rcy1lMmUtc3RhdGljLXNlY3JldC0zMg";

function loadState(): RecoveryState {
  return JSON.parse(readFileSync(STATE_PATH, "utf-8")) as RecoveryState;
}

function exposeTestShadowRoots() {
  return () => {
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function attachShadow(init: ShadowRootInit) {
      return originalAttachShadow.call(this, { ...init, mode: "open" });
    };
  };
}

function injectTestWallet() {
  return ({ address, privateKey, walletName }: Record<string, string>) => {
    const requests: string[] = [];
    const ethers = (window as typeof window & { ethers: any }).ethers;
    const wallet = new ethers.Wallet(privateKey);
    const provider = {
      selectedAddress: address,
      chainId: "0x1",
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        requests.push(method);
        switch (method) {
          case "eth_requestAccounts":
          case "eth_accounts":
            return [address];
          case "eth_chainId":
            return "0x1";
          case "personal_sign": {
            const message = params?.[0];
            if (typeof message !== "string") throw new Error("personal_sign missing message");
            return wallet.signMessage(
              message.startsWith("0x") ? ethers.utils.arrayify(message) : message,
            );
          }
          case "wallet_getPermissions":
          case "wallet_requestPermissions":
            return [{ parentCapability: "eth_accounts" }];
          case "wallet_switchEthereumChain":
          case "wallet_addEthereumChain":
            return null;
          default:
            return null;
        }
      },
      on: () => provider,
      removeListener: () => provider,
      isConnected: () => true,
    };
    const announceProvider = () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: {
              uuid: "bf2a94d9-6902-43a6-8b46-bad52be3f171",
              name: walletName,
              icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Crect width='28' height='28' rx='6' fill='%23111827'/%3E%3Ctext x='14' y='18' text-anchor='middle' font-size='11' font-family='Arial' fill='white'%3ETC%3C/text%3E%3C/svg%3E",
              rdns: "xyz.tinycloud.listen-test-wallet",
            },
            provider,
          },
        }),
      );
    };
    Object.defineProperty(window, "ethereum", { value: provider, configurable: true });
    Object.defineProperty(window, "__walletRequests", { value: requests, configurable: true });
    window.addEventListener("eip6963:requestProvider", announceProvider);
    announceProvider();
  };
}

async function installWallet(page: Page, state: RecoveryState, privateKey: string): Promise<void> {
  await page.addInitScript(exposeTestShadowRoots());
  await page.addInitScript({ path: ETHERS_UMD_PATH });
  await page.addInitScript(injectTestWallet(), {
    address: state.address,
    privateKey,
    walletName: TEST_WALLET_NAME,
  });
}

async function chooseExternalWallet(page: Page): Promise<void> {
  await page
    .frameLocator('iframe[src*="/widget/embed/connect"]')
    .getByText(/or use an external wallet/i)
    .click();
  await expect(page.getByText(TEST_WALLET_NAME)).toBeVisible();
  await page.getByText(TEST_WALLET_NAME).click();
}

async function completeReconnectWalletFlow(
  page: Page,
  address: string,
  oldDelegationCid: string,
): Promise<void> {
  const externalWallet = page
    .frameLocator('iframe[src*="/widget/embed/connect"]')
    .getByText(/or use an external wallet/i);
  const outcome = await Promise.race([
    externalWallet.waitFor({ state: "visible", timeout: 45_000 }).then(() => "prompt" as const),
    page
      .waitForFunction(
        ({ walletAddress, previousCid }) => {
          const raw = localStorage.getItem(`tinycloud:session:${walletAddress.toLowerCase()}`);
          const cid = raw ? JSON.parse(raw).tinycloudSession?.delegationCid : undefined;
          return typeof cid === "string" && cid !== previousCid;
        },
        { walletAddress: address, previousCid: oldDelegationCid },
        { timeout: 45_000 },
      )
      .then(() => "connected" as const),
  ]);

  if (outcome === "prompt") {
    await externalWallet.click();
    await expect(page.getByText(TEST_WALLET_NAME)).toBeVisible();
    await page.getByText(TEST_WALLET_NAME).click();
  }
}

async function importTranscript(page: Page, title: string): Promise<void> {
  const titleField = page.getByLabel("Title");
  if (!(await titleField.isVisible())) {
    await page.getByRole("button", { name: "Import ->" }).click();
  }
  await titleField.fill(title);
  await page
    .getByLabel("Transcript", { exact: true })
    .fill(
      "[00:00] Sam: The browser completed a real delegated write.\n[00:03] Alex: Recovery should preserve it.",
    );
  await page.getByRole("button", { name: "Import transcript" }).click();
  const imported = page.getByText("Transcript imported", { exact: true });
  const importedConversation = page.getByText(title, { exact: true });
  const importError = page.getByTestId("transcript-import-error");
  await Promise.race([
    imported.waitFor({ state: "visible", timeout: 60_000 }),
    importedConversation.waitFor({ state: "visible", timeout: 60_000 }),
    importError
      .first()
      .waitFor({ state: "visible", timeout: 60_000 })
      .then(async () => {
        throw new Error(`Transcript import failed: ${await importError.first().innerText()}`);
      }),
  ]);
  if (await imported.isVisible()) {
    await page.getByRole("button", { name: "Continue to library", exact: true }).click();
  }
  await expect(page.getByText(title)).toBeVisible();
}

async function importTranscriptFromHub(page: Page, title: string): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Add transcripts" });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog
    .getByLabel("Transcript text")
    .fill(
      "[00:00] Sam: The recovered session completed a delegated write.\n[00:03] Alex: The new parent is active.",
    );
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^${title}`) })).toBeVisible();
}

function killProcessGroup(pid: number): void {
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
}

async function waitForNodeDown(url: string): Promise<void> {
  await expect
    .poll(
      async () =>
        fetch(url)
          .then(() => false)
          .catch(() => true),
      { timeout: 30_000 },
    )
    .toBe(true);
}

async function waitForNode(url: string): Promise<void> {
  await expect
    .poll(
      async () =>
        fetch(url)
          .then((response) => response.ok)
          .catch(() => false),
      {
        timeout: 120_000,
      },
    )
    .toBe(true);
}

function removeRootDelegation(dataDir: string, delegationCid: string): void {
  execFileSync("bun", [DELETE_ROOT_SCRIPT, dataDir, delegationCid], { stdio: "inherit" });
}

function restartTinyCloudNode(state: RecoveryState): number {
  const log = createWriteStream(resolve(state.tmpDir, "logs", "tinycloud-node-restart.log"), {
    flags: "a",
  });
  const command =
    process.env.TINYCLOUD_NODE_COMMAND ??
    `cargo run --manifest-path "${resolve(state.tinycloudRepo, "Cargo.toml")}"`;
  const child = spawn(command, {
    cwd: state.tinycloudRepo,
    detached: true,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      TINYCLOUD_ADDRESS: "127.0.0.1",
      TINYCLOUD_PORT: String(state.tinycloudPort),
      TINYCLOUD_CORS: "true",
      TINYCLOUD_STORAGE_DATADIR: state.tinycloudDataDir,
      TINYCLOUD_STORAGE__DATADIR: state.tinycloudDataDir,
      TINYCLOUD_STORAGE_DATABASE: `sqlite:${resolve(state.tinycloudDataDir, "caps.db")}`,
      TINYCLOUD_STORAGE__DATABASE: `sqlite:${resolve(state.tinycloudDataDir, "caps.db")}`,
      TINYCLOUD_STORAGE_BLOCKS_TYPE: "Local",
      TINYCLOUD_STORAGE__BLOCKS__TYPE: "Local",
      TINYCLOUD_STORAGE_BLOCKS_PATH: resolve(state.tinycloudDataDir, "blocks"),
      TINYCLOUD_STORAGE__BLOCKS__PATH: resolve(state.tinycloudDataDir, "blocks"),
      TINYCLOUD_KEYS_TYPE: "Static",
      TINYCLOUD_KEYS__TYPE: "Static",
      TINYCLOUD_KEYS_SECRET: process.env.TINYCLOUD_KEYS_SECRET ?? DEFAULT_TINYCLOUD_NODE_SECRET,
      TINYCLOUD_KEYS__SECRET: process.env.TINYCLOUD_KEYS_SECRET ?? DEFAULT_TINYCLOUD_NODE_SECRET,
    },
  });
  child.stdout?.pipe(log, { end: false });
  child.stderr?.pipe(log, { end: false });
  child.once("close", () => log.end());
  if (!child.pid) throw new Error("Failed to restart TinyCloud node");

  const pids = JSON.parse(readFileSync(PID_PATH, "utf-8")) as StartedProcess[];
  pids.push({ name: "tinycloud-node-restart", pid: child.pid });
  writeFileSync(PID_PATH, JSON.stringify(pids, null, 2), { mode: 0o600 });
  return child.pid;
}

test("recovers one dead browser parent through the real OpenKey wallet flow", async ({ page }) => {
  const state = loadState();
  const privateKey = process.env.LISTEN_E2E_OWNER_PRIVATE_KEY;
  if (!privateKey) throw new Error("LISTEN_E2E_OWNER_PRIVATE_KEY is required");
  await installWallet(page, state, privateKey);
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/") && response.status() >= 400) {
      console.log(`[recovery-e2e] ${response.status()} ${url.pathname}`);
    }
  });

  const beforeTitle = `Recovery E2E before ${Date.now()}`;
  await page.goto(state.baseURL);
  await page.getByRole("banner").getByRole("button", { name: "Open app" }).click();
  await chooseExternalWallet(page);
  await importTranscript(page, beforeTitle);

  const oldSession = await page.evaluate((address) => {
    const raw = localStorage.getItem(`tinycloud:session:${address.toLowerCase()}`);
    if (!raw) throw new Error("TinyCloud browser session was not persisted");
    return JSON.parse(raw) as { tinycloudSession?: { delegationCid?: string } };
  }, state.address);
  const oldDelegationCid = oldSession.tinycloudSession?.delegationCid;
  if (!oldDelegationCid) throw new Error("Persisted session has no delegationCid");

  const node = state.pids.find((process) => process.name === "tinycloud-node");
  if (!node) throw new Error("Harness does not own a local TinyCloud node");
  killProcessGroup(node.pid);
  await waitForNodeDown(`${state.tinycloudHost}/version`);
  removeRootDelegation(state.tinycloudDataDir, oldDelegationCid);
  restartTinyCloudNode(state);
  await waitForNode(`${state.tinycloudHost}/version`);

  await page.goto(state.baseURL);
  await page.getByRole("banner").getByRole("button", { name: "Open app" }).click();
  await expect(page.getByTestId("storage-session-recovery")).toBeVisible();
  const automaticWalletRequests = await page.evaluate(
    () => (window as any).__walletRequests as string[],
  );
  expect(automaticWalletRequests).not.toContain("personal_sign");

  await page.getByTestId("storage-session-reconnect").click();
  await completeReconnectWalletFlow(page, state.address, oldDelegationCid);
  await expect(page.getByTestId("storage-session-recovery")).toBeHidden({ timeout: 60_000 });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const stored = localStorage.getItem("listen:session");
          return stored ? Boolean((JSON.parse(stored) as { token?: string }).token) : false;
        }),
      { timeout: 60_000 },
    )
    .toBe(true);
  const restoredTitles = await page.evaluate(async (backendURL) => {
    const stored = localStorage.getItem("listen:session");
    if (!stored) throw new Error("Listen session was not restored");
    const token = (JSON.parse(stored) as { token?: string }).token;
    if (!token) throw new Error("Restored Listen session has no token");

    const response = await fetch(`${backendURL}/api/conversations?limit=20&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Restored conversation read failed: ${response.status}`);
    const payload = (await response.json()) as { conversations?: Array<{ title?: string }> };
    return (payload.conversations ?? []).map((conversation) => conversation.title);
  }, state.backendURL);
  expect(restoredTitles).toContain(beforeTitle);
  await expect(page.getByText(beforeTitle)).toBeVisible();

  await expect
    .poll(async () => {
      const delegationCid = await page.evaluate((address) => {
        const raw = localStorage.getItem(`tinycloud:session:${address.toLowerCase()}`);
        return raw
          ? (JSON.parse(raw).tinycloudSession?.delegationCid as string | undefined)
          : undefined;
      }, state.address);
      return typeof delegationCid === "string" && delegationCid !== oldDelegationCid;
    })
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        ((window as any).__walletRequests as string[]).filter(
          (method) => method === "personal_sign",
        ),
      ),
    )
    .toHaveLength(1);

  await page.getByRole("button", { name: /Add source or transcript/i }).click();
  const afterTitle = `Recovery E2E after ${Date.now()}`;
  await importTranscriptFromHub(page, afterTitle);
});

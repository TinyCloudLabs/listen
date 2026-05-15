import { chromium } from "playwright";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CRED_FILE = resolve(__dirname, ".passkey.json");
const LOG_FILE = resolve(__dirname, ".last-run.log");
const APP_URL = process.env.APP_URL ?? "https://localhost:5173/";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY;
const HEADLESS = process.env.HEADLESS === "1";

if (!existsSync(CRED_FILE)) {
  console.error(`No credentials at ${CRED_FILE}. Run \`bun run setup\` first.`);
  process.exit(1);
}

const credentials = JSON.parse(readFileSync(CRED_FILE, "utf-8"));

// A virtual authenticator credential export includes the authenticator's
// signature counter. OpenKey persists the last accepted counter server-side,
// so replaying the original captured value can look like a cloned credential
// and fail before the app's sign-in code is reached. Bump before loading and
// persist the post-run value so unattended runs stay monotonic.
for (const credential of credentials) {
  credential.signCount = Math.max(Number(credential.signCount) || 0, 1) + 100;
}

const browser = await chromium.launch({ headless: HEADLESS });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await cdp.send("WebAuthn.enable", { enableUI: false });
const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: {
    protocol: "ctap2",
    transport: "internal",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
});

for (const credential of credentials) {
  await cdp.send("WebAuthn.addCredential", { authenticatorId, credential });
}

const lines: string[] = [];
const log = (line: string) => {
  console.log(line);
  lines.push(line);
};
const clickedFrameButtons = new Set<string>();

const shouldLogNetwork = (url: string) =>
  /\/(delegate|api\/delegations|api\/manifest|api\/server-info|nonce|verify)/.test(url);
const formatAuthorization = (auth: string) =>
  auth.startsWith("Bearer ") ? "Bearer <redacted>" : `raw <redacted:${auth.length} chars>`;
const formatResponseBody = (url: string, body: string, status: number) => {
  if ((url.includes("api.openkey.so") && status < 400) || /\/api\/auth\/verify\b/.test(url)) {
    return "<redacted auth response>";
  }
  return `${body.slice(0, 500)}${body.length > 500 ? "..." : ""}`;
};

context.on("page", (p) => {
  log(`[popup] ${p.url()}`);
  p.on("console", (msg) => log(`[popup console ${msg.type()}] ${msg.text()}`));
});

page.on("console", (msg) => log(`[console ${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => log(`[pageerror] ${err.message}`));

page.on("request", (req) => {
  if (shouldLogNetwork(req.url())) {
    log(`[req] ${req.method()} ${req.url()}`);
    const auth = req.headers()["authorization"];
    if (auth) log(`  authorization: ${formatAuthorization(auth)}`);
  }
});

page.on("response", async (res) => {
  if (shouldLogNetwork(res.url())) {
    const body = await res.text().catch(() => "<no body>");
    log(`[res ${res.status()}] ${res.request().method()} ${res.url()}`);
    log(`  body: ${formatResponseBody(res.url(), body, res.status())}`);
  }
});

async function driveOpenKeyFrames(): Promise<void> {
  for (const frame of page.frames()) {
    if (!frame.url().startsWith("https://openkey.so/")) continue;

    const bodyText = await frame
      .locator("body")
      .innerText({ timeout: 750 })
      .catch(() => "");
    if (bodyText) {
      log(`[openkey frame] ${frame.url()} :: ${bodyText.replace(/\s+/g, " ").slice(0, 180)}`);
    }

    const candidates = [
      /sign in with passkey/i,
      /^key\s*\d+/i,
      /^sign$/i,
      /sign message/i,
      /approve/i,
      /confirm/i,
      /^continue$/i,
    ];

    for (const pattern of candidates) {
      const button = frame.getByRole("button", { name: pattern }).first();
      const key = `${frame.url()}::${pattern.source}`;
      if (clickedFrameButtons.has(key)) continue;
      if (await button.isVisible({ timeout: 250 }).catch(() => false)) {
        clickedFrameButtons.add(key);
        log(`[openkey frame] clicking ${pattern}`);
        await button.click({ timeout: 2_000 }).catch((error) => {
          log(
            `[openkey frame] click failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
        return;
      }
    }
  }
}

log(`Opening ${APP_URL}`);
await page.goto(APP_URL);

const signInBtn = page.getByRole("button", { name: /open app|sign in/i });
await signInBtn.waitFor({ timeout: 10_000 });
log("Clicking Open app");
await signInBtn.click();

const frameDriver = setInterval(() => {
  driveOpenKeyFrames().catch((error) => {
    log(`[openkey frame] driver error: ${error instanceof Error ? error.message : String(error)}`);
  });
}, 750);

const ok = await Promise.race([
  page
    .waitForFunction(() => /signed in|connected|address/i.test(document.body.innerText), {
      timeout: 90_000,
    })
    .then(() => "signed-in" as const)
    .catch(() => null),
  page
    .waitForFunction(() => /error|failed|401|403/i.test(document.body.innerText), {
      timeout: 90_000,
    })
    .then(() => "error" as const)
    .catch(() => null),
]);
clearInterval(frameDriver);

log(`Outcome: ${ok ?? "timeout"}`);

async function backendRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const sessionRaw = await page.evaluate(() => localStorage.getItem("listen:session"));
  if (!sessionRaw) throw new Error("No frontend session in localStorage after sign-in");

  const token = JSON.parse(sessionRaw).token;
  if (!token) throw new Error("Frontend session did not include a token");

  const result = await page.evaluate(
    async ({ backendUrl, method, path, body, token }) => {
      const res = await fetch(`${backendUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Requested-With": "Listen",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    },
    { backendUrl: BACKEND_URL, method, path, body, token },
  );

  log(`[backend] ${method} ${path} -> ${result.status}`);

  let parsed: unknown = null;
  if (result.text) {
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = result.text;
    }
  }

  if (!result.ok) {
    const message =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : result.text;
    throw new Error(`Backend ${method} ${path} failed (${result.status}): ${message}`);
  }

  return parsed as T;
}

async function clickOptional(name: RegExp, timeout = 1_500): Promise<boolean> {
  const button = page.getByRole("button", { name }).first();
  if (!(await button.isVisible({ timeout }).catch(() => false))) return false;
  log(`[ui] clicking ${name}`);
  await button.click();
  return true;
}

async function clickRequired(name: RegExp, timeout = 15_000): Promise<void> {
  const button = page.getByRole("button", { name }).first();
  await button.waitFor({ timeout });
  log(`[ui] clicking ${name}`);
  await button.click();
}

async function configureFirefliesThroughUI(apiKey: string): Promise<void> {
  if (await clickOptional(/disconnect fireflies/i, 3_000)) {
    await page.waitForFunction(
      () => /connect fireflies|get your api key|paste api key/i.test(document.body.innerText),
      { timeout: 15_000 },
    );
  }

  await clickOptional(/connect fireflies/i, 3_000);
  await clickOptional(/get started/i, 3_000);
  await clickOptional(/^next$/i, 3_000);

  let input = page.getByPlaceholder(/paste your fireflies api key/i);
  if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
    const syncButton = page.getByRole("button", { name: /sync fireflies/i }).first();
    if (await syncButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
      log("[fireflies] existing key detected; clearing it via backend before UI setup");
      await backendRequest("DELETE", "/api/config/fireflies-key");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => /signed in|connected|address/i.test(document.body.innerText),
        {
          timeout: 30_000,
        },
      );
      await clickOptional(/connect fireflies/i, 5_000);
      await clickOptional(/get started/i, 3_000);
      await clickOptional(/^next$/i, 3_000);
      input = page.getByPlaceholder(/paste your fireflies api key/i);
    }
  }
  await input.waitFor({ timeout: 15_000 });
  log("[ui] entering Fireflies API key in setup form");
  await input.fill(apiKey);

  await clickRequired(/save & verify/i);

  const verified = await Promise.race([
    page
      .getByText(/connected as/i)
      .waitFor({ timeout: 60_000 })
      .then(() => true)
      .catch(() => false),
    page
      .getByRole("button", { name: /try again/i })
      .waitFor({ timeout: 60_000 })
      .then(() => false)
      .catch(() => false),
  ]);
  if (!verified) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    throw new Error(`Fireflies setup did not verify through UI: ${bodyText.slice(0, 500)}`);
  }
  log("[ui] Fireflies key verified through setup form");

  await clickOptional(/^continue$/i, 3_000);
  await clickOptional(/^skip$/i, 3_000);
  await clickOptional(/start syncing/i, 3_000);
}

async function syncFirefliesThroughUI(): Promise<void> {
  await clickRequired(/sync fireflies/i, 30_000);
  await page.waitForTimeout(750);
  await page.getByRole("button", { name: /sync fireflies/i }).waitFor({ timeout: 180_000 });

  const bodyText = await page.locator("body").innerText();
  if (/no fireflies api key|sync failed|stream failed|api error/i.test(bodyText)) {
    throw new Error(`Fireflies sync failed through UI: ${bodyText.slice(0, 600)}`);
  }
  log("[ui] Fireflies sync completed through SyncControl");
}

if (ok === "signed-in" && FIREFLIES_API_KEY) {
  log("[fireflies] configuring via frontend setup flow");
  await configureFirefliesThroughUI(FIREFLIES_API_KEY);
  const exists = await backendRequest<{ exists: boolean }>(
    "GET",
    "/api/config/fireflies-key/exists",
  );
  log(`[fireflies] key exists in delegated TinyCloud KV: ${exists.exists}`);
  if (!exists.exists) throw new Error("Fireflies key was not readable after storing");

  await syncFirefliesThroughUI();

  const conversations = await backendRequest<{ conversations: unknown[]; total: number }>(
    "GET",
    "/api/conversations?limit=5&offset=0&source=fireflies",
  );
  log(`[fireflies] conversations visible through backend: ${conversations.total}`);
}

const updated = await cdp.send("WebAuthn.getCredentials", { authenticatorId });
if (updated.credentials.length > 0) {
  writeFileSync(CRED_FILE, JSON.stringify(updated.credentials, null, 2));
  log(`Updated ${updated.credentials.length} virtual passkey credential(s).`);
}

writeFileSync(LOG_FILE, lines.join("\n"));
log(`Wrote diagnostics to ${LOG_FILE}`);

if (process.env.KEEP_OPEN !== "1") await browser.close();

if (ok !== "signed-in") {
  process.exit(1);
}

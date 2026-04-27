import { chromium } from "playwright";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CRED_FILE = resolve(__dirname, ".passkey.json");
const LOG_FILE = resolve(__dirname, ".last-run.log");
const APP_URL = process.env.APP_URL ?? "https://localhost:5173/";

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

const browser = await chromium.launch({ headless: false });
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
  /\/(delegate|api\/delegations|api\/server-info|nonce|verify)/.test(url);
const formatAuthorization = (auth: string) =>
  auth.startsWith("Bearer ") ? "Bearer <redacted>" : `raw <redacted:${auth.length} chars>`;
const formatResponseBody = (url: string, body: string) => {
  if (url.includes("api.openkey.so") || /\/api\/auth\/verify\b/.test(url)) {
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
    log(`  body: ${formatResponseBody(res.url(), body)}`);
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

const signInBtn = page.getByRole("button", { name: /sign in/i });
await signInBtn.waitFor({ timeout: 10_000 });
log("Clicking Sign In");
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

const updated = await cdp.send("WebAuthn.getCredentials", { authenticatorId });
if (updated.credentials.length > 0) {
  writeFileSync(CRED_FILE, JSON.stringify(updated.credentials, null, 2));
  log(`Updated ${updated.credentials.length} virtual passkey credential(s).`);
}

writeFileSync(LOG_FILE, lines.join("\n"));
log(`Wrote diagnostics to ${LOG_FILE}`);

if (process.env.KEEP_OPEN !== "1") await browser.close();

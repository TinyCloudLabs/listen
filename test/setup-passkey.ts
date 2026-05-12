import { chromium } from "playwright";
import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CRED_FILE = resolve(__dirname, ".passkey.json");
const APP_URL = process.env.APP_URL ?? "https://localhost:5173/";
const OPENKEY_HOST = process.env.OPENKEY_HOST ?? "https://openkey.so";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "test@gbafa.com";

if (existsSync(CRED_FILE)) {
  console.log(`Credentials already exist at ${CRED_FILE}`);
  console.log("Delete it to re-register, or just run `bun run signin`.");
  process.exit(0);
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

console.log("Virtual authenticator ready:", authenticatorId);
console.log("");
console.log("In the open browser:");
console.log(`  1. Sign up for OpenKey at ${OPENKEY_HOST} with email: ${TEST_EMAIL}`);
console.log("  2. When OpenKey prompts to register a passkey, the virtual");
console.log("     authenticator handles it (no Touch ID needed).");
console.log(`  3. Then go to ${APP_URL}, click Open app, complete the flow once`);
console.log("     so the credential gets exercised end-to-end.");
console.log("  4. Return here and press Enter to capture the credential.");
console.log("");

await page.goto(OPENKEY_HOST);

const rl = createInterface({ input: process.stdin, output: process.stdout });
await new Promise<void>((res) =>
  rl.question("Press Enter when done... ", () => {
    rl.close();
    res();
  }),
);

const { credentials } = await cdp.send("WebAuthn.getCredentials", { authenticatorId });
console.log(`Captured ${credentials.length} credential(s).`);

if (credentials.length === 0) {
  console.error("No credentials captured. Did you complete passkey registration?");
  await browser.close();
  process.exit(1);
}

writeFileSync(CRED_FILE, JSON.stringify(credentials, null, 2));
console.log(`Saved to ${CRED_FILE}`);

await browser.close();

import { chromium } from "playwright";

async function debug() {
  const browser = await chromium.launch({ headless: false, devtools: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console output
  page.on("console", (msg) => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  console.log("Opening http://localhost:5173 ...");
  await page.goto("http://localhost:5173");
  await page.waitForLoadState("networkidle");

  // 1. Click Sign In
  console.log("\n--- Clicking Sign In ---");
  const popupPromise = context.waitForEvent("page", { timeout: 15000 });
  await page.getByRole("button", { name: "Sign in with OpenKey" }).click();
  const popup = await popupPromise;

  // Wait for popup to do its thing — user authenticates manually
  console.log("Waiting for OpenKey popup to complete (authenticate manually)...");
  console.log(`Popup URL: ${popup.url().slice(0, 80)}`);

  // Wait up to 60s for popup to close (user authenticates with passkey)
  await popup.waitForEvent("close", { timeout: 60000 }).catch(() => {
    console.log("Popup didn't close in 60s");
  });

  if (popup.isClosed()) {
    console.log("Popup closed — OAuth complete");
  }

  // Wait for sign-in to process
  await page.waitForTimeout(5000);

  // 2. Check the state after sign-in
  console.log("\n--- Checking state after sign-in ---");
  const stateCheck = await page.evaluate(() => {
    // Check what React state looks like
    const body = document.body.innerText;
    return {
      bodySnippet: body.slice(0, 500),
      hasSignOut: body.includes("Sign Out") || body.includes("sign out"),
      hasGrantAccess: body.includes("Grant Backend Access"),
      hasSigningIn: body.includes("Signing in"),
      hasError: body.includes("Error") || body.includes("error") || body.includes("failed"),
    };
  });
  console.log("State:", JSON.stringify(stateCheck, null, 2));
  await page.screenshot({ path: "/tmp/debug-after-signin.png" });

  // 3. If signed in, try Grant Backend Access
  if (stateCheck.hasGrantAccess) {
    console.log("\n--- Clicking Grant Backend Access ---");

    // Capture any popup that might open for signing
    const signingPopupPromise = context.waitForEvent("page", { timeout: 10000 }).catch(() => null);

    await page.getByRole("button", { name: "Grant Backend Access" }).click();

    const signingPopup = await signingPopupPromise;
    if (signingPopup) {
      console.log(`Signing popup opened: ${signingPopup.url()}`);
      // Wait for user to approve signing
      await signingPopup.waitForEvent("close", { timeout: 30000 }).catch(() => {});
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: "/tmp/debug-after-grant.png" });

    const grantResult = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log("\nAfter grant:\n" + grantResult);
  }

  console.log("\nBrowser open 120s for manual inspection...");
  await page.waitForTimeout(120000);
  await browser.close();
}

debug().catch(console.error);

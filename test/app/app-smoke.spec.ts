import { expect, test, type Page, type Route } from "@playwright/test";

const TEST_ADDRESS = "0x0000000000000000000000000000000000001384";
const TEST_TOKEN = "tc-1384-e2e-token";
const CONVERSATION_ID = "tc-1384-smoke-conversation";

const conversation = {
  id: CONVERSATION_ID,
  title: "TC-1384 Smoke Conversation",
  source: "manual",
  source_url: null,
  started_at: "2026-05-14T14:00:00.000Z",
  duration_secs: 1840,
  summary: "This smoke conversation verifies restored-session navigation.",
  created_at: "2026-05-14T14:30:40.000Z",
  participant_count: 2,
};

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockListenBackend(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/server-info") {
      await fulfillJson(route, {
        did: "did:key:tc-1384-backend",
        status: "ready",
        name: "Listen Backend",
        expiry: "7d",
        permissions: [
          {
            service: "tinycloud.kv",
            path: "/",
            actions: ["get", "put", "del", "list", "metadata"],
          },
          {
            service: "tinycloud.sql",
            path: "conversations",
            actions: ["read", "write"],
          },
        ],
        features: {
          googleMeet: { available: false, reason: "google_client_not_configured" },
        },
      });
      return;
    }

    if (url.pathname === "/api/manifest") {
      await fulfillJson(route, {
        manifest_version: 1,
        app_id: "xyz.tinycloud.listen",
        name: "Listen",
        description: "Smoke-test manifest for Listen app automation.",
        defaults: true,
      });
      return;
    }

    if (url.pathname === "/api/delegations/status") {
      await fulfillJson(route, {
        status: "active",
        expiresAt: "2026-05-21T00:00:00.000Z",
      });
      return;
    }

    if (url.pathname === "/api/workspace-state") {
      await fulfillJson(route, {
        delegation: {
          status: "active",
          stored: true,
          validPolicy: true,
          expiresAt: "2026-05-21T00:00:00.000Z",
          activation: "active",
        },
        backendReadableSecrets: {
          fireflies: { readable: false },
          granola: { readable: false },
          assemblyai: { readable: false },
          deepgram: { readable: false },
        },
        googleMeet: {
          available: false,
          connected: false,
        },
        conversations: {
          hasAny: true,
          total: 1,
        },
      });
      return;
    }

    if (/^\/api\/config\/[^/]+-key\/exists$/.test(url.pathname)) {
      await fulfillJson(route, { exists: false });
      return;
    }

    if (url.pathname === "/api/config/google-meet/connected") {
      await fulfillJson(route, { connected: false });
      return;
    }

    if (url.pathname === "/api/config/webhook-status") {
      await fulfillJson(route, {
        configured: false,
        pendingCount: 0,
        webhookUrl: `${url.origin}/api/webhooks/fireflies`,
      });
      return;
    }

    if (url.pathname === `/api/conversations/${CONVERSATION_ID}`) {
      await fulfillJson(route, {
        conversation: {
          ...conversation,
          metadata: {},
        },
        participants: [
          {
            id: "speaker-1",
            name: "Ada Lovelace",
            email: "ada@example.test",
            speaker_label: "Speaker 1",
          },
          {
            id: "speaker-2",
            name: "Grace Hopper",
            email: "grace@example.test",
            speaker_label: "Speaker 2",
          },
        ],
        transcript: [
          {
            index: 0,
            speaker_id: "speaker-1",
            speaker_name: "Ada Lovelace",
            text: "The restored session opened the app shell.",
            start_time: 0,
            end_time: 4,
          },
          {
            index: 1,
            speaker_id: "speaker-2",
            speaker_name: "Grace Hopper",
            text: "The test can click through the primary routes.",
            start_time: 5,
            end_time: 9,
          },
        ],
      });
      return;
    }

    if (url.pathname === "/api/conversations") {
      await fulfillJson(route, {
        conversations: [conversation],
        total: 1,
      });
      return;
    }

    await fulfillJson(
      route,
      {
        error: "unhandled_test_route",
        message: `No Playwright mock is registered for ${route.request().method()} ${url.pathname}`,
      },
      501,
    );
  });
}

test.beforeEach(async ({ page }) => {
  await mockListenBackend(page);
  await page.addInitScript(
    ({ address, token }) => {
      localStorage.setItem(
        "listen:session",
        JSON.stringify({
          token,
          address,
          expiresAt: Date.now() + 60 * 60 * 1000,
        }),
      );
    },
    { address: TEST_ADDRESS, token: TEST_TOKEN },
  );
});

test("restores a session and clicks through the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /open app/i }).first()).toBeVisible();
  await page
    .getByRole("button", { name: /open app/i })
    .first()
    .click();

  await expect(page.getByRole("heading", { name: "Everything you've said." })).toBeVisible();
  await expect(page.getByText("TC-1384 Smoke Conversation")).toBeVisible();

  await page.getByText("TC-1384 Smoke Conversation").click();
  await expect(page.getByRole("heading", { name: "TC-1384 Smoke Conversation" })).toBeVisible();
  await expect(page.getByText("The test can click through the primary routes.")).toBeVisible();

  await page.getByRole("button", { name: /back to inbox/i }).click();
  await expect(page.getByRole("heading", { name: "Everything you've said." })).toBeVisible();

  await page.getByRole("button", { name: "Chat" }).click();
  await expect(page.getByRole("heading", { name: "Chat is under development." })).toBeVisible();

  await page.getByRole("button", { name: /add source or transcript/i }).click();
  await expect(page.getByRole("heading", { name: "Connections.", exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: /^Add source or transcript$/ })
    .last()
    .click();
  await expect(page.getByRole("heading", { name: "Reconnect wallet." })).toBeVisible();
});

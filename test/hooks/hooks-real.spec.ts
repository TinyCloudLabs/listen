import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface E2EState {
  backendURL: string;
  listenSession: {
    token: string;
    expiresAt: number;
    address: string;
  };
  tinycloudSessionKey: string;
  tinycloudSession: unknown;
  initialConversationTitle: string;
  liveConversationTitle: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, "..", ".tmp", "hooks-real-e2e", "state.json");

function loadState(): E2EState {
  return JSON.parse(readFileSync(STATE_PATH, "utf-8")) as E2EState;
}

test("backend import emits a TinyCloud hook and refreshes the frontend inbox", async ({
  page,
  request,
}) => {
  const state = loadState();

  await page.addInitScript(
    ({ listenSession, tinycloudSessionKey, tinycloudSession }) => {
      window.localStorage.setItem("listen:session", JSON.stringify(listenSession));
      window.localStorage.setItem(tinycloudSessionKey, JSON.stringify(tinycloudSession));
    },
    {
      listenSession: state.listenSession,
      tinycloudSessionKey: state.tinycloudSessionKey,
      tinycloudSession: state.tinycloudSession,
    },
  );

  const ticketReady = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/hooks/tickets") &&
      response.status() === 200,
  );
  const eventStreamReady = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().includes("/hooks/events?ticket=") &&
      response.status() === 200,
  );

  await page.goto("/");
  await expect(page.getByText(state.initialConversationTitle)).toBeVisible();
  await ticketReady;
  await eventStreamReady;

  const response = await request.post(`${state.backendURL}/api/conversations/import`, {
    headers: {
      Authorization: `Bearer ${state.listenSession.token}`,
      "Content-Type": "application/json",
      "X-Requested-With": "Listen",
    },
    data: {
      title: state.liveConversationTitle,
      transcriptText: "[00:00] Sam: The backend wrote this row\n[00:02] Alex: Hooks should notify",
      startedAt: new Date().toISOString(),
      participants: "Sam, Alex",
      summary: "Real hooks E2E live write.",
    },
  });

  expect(response.status()).toBe(201);
  await expect(page.getByText(state.liveConversationTitle)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Live Writes" })).toBeVisible();
  await expect(page.getByText("tinycloud.sql/write").first()).toBeVisible();
});

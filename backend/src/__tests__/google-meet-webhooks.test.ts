import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";

// Import the real parsePubSubConfig before mocking the module
import { parsePubSubConfig } from "../services/pubsub-manager";

// Mock ensurePubSubInfra but keep real parsePubSubConfig
const mockEnsurePubSubInfra = mock(async (_config?: any, _client?: any) => {});

mock.module("../services/pubsub-manager", () => ({
  parsePubSubConfig,
  ensurePubSubInfra: mockEnsurePubSubInfra,
}));

// Import module under test (gets mocked ensurePubSubInfra)
import {
  initGoogleMeetWebhooks,
  isGoogleMeetWebhooksEnabled,
  _resetForTesting,
} from "../services/google-meet-webhooks";

// --- Fixtures ---

const FAKE_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "my-project-123",
  client_email: "sa@my-project-123.iam.gserviceaccount.com",
  private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
};

const FAKE_PUSH_URL = "https://abc.ngrok-free.app/api/webhooks/google-meet";

// --- Tests ---

describe("google-meet-webhooks startup integration", () => {
  const originalEnv = { ...process.env };
  let consoleWarnSpy: ReturnType<typeof spyOn>;
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    _resetForTesting();
    mockEnsurePubSubInfra.mockClear();
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("defaults to disabled before init", () => {
    expect(isGoogleMeetWebhooksEnabled()).toBe(false);
  });

  it("enables webhooks and calls ensurePubSubInfra when env vars are set", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(FAKE_SERVICE_ACCOUNT);
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    await initGoogleMeetWebhooks();

    expect(isGoogleMeetWebhooksEnabled()).toBe(true);
    expect(mockEnsurePubSubInfra).toHaveBeenCalledTimes(1);
  });

  it("stays disabled and logs warning when env vars are missing", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_PUBSUB_PUSH_URL;

    await initGoogleMeetWebhooks();

    expect(isGoogleMeetWebhooksEnabled()).toBe(false);
    expect(mockEnsurePubSubInfra).not.toHaveBeenCalled();

    const warnCalls = consoleWarnSpy.mock.calls.flat();
    expect(warnCalls.some((msg: string) => msg.includes("Google Meet webhooks disabled"))).toBe(
      true,
    );
  });

  it("stays disabled and logs warning when ensurePubSubInfra throws", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(FAKE_SERVICE_ACCOUNT);
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    mockEnsurePubSubInfra.mockRejectedValueOnce(new Error("API error"));

    await initGoogleMeetWebhooks();

    expect(isGoogleMeetWebhooksEnabled()).toBe(false);
    const warnCalls = consoleWarnSpy.mock.calls.flat();
    expect(warnCalls.some((msg: string) => msg.includes("Pub/Sub setup failed"))).toBe(true);
  });

  it("stays disabled when service account JSON is invalid", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "not-valid-json{";
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    await initGoogleMeetWebhooks();

    expect(isGoogleMeetWebhooksEnabled()).toBe(false);
    expect(mockEnsurePubSubInfra).not.toHaveBeenCalled();
  });

  it("passes parsed config to ensurePubSubInfra", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(FAKE_SERVICE_ACCOUNT);
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    await initGoogleMeetWebhooks();

    const config = mockEnsurePubSubInfra.mock.calls[0][0];
    expect(config).toEqual({
      projectId: "my-project-123",
      serviceAccountEmail: "sa@my-project-123.iam.gserviceaccount.com",
      pushUrl: FAKE_PUSH_URL,
      credentials: FAKE_SERVICE_ACCOUNT,
    });
  });
});

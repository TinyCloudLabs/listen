import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
// Import with the explicit .ts extension so this import gets a separate
// module cache key from the `mock.module("../services/pubsub-manager", ...)`
// call in google-meet-webhooks.test.ts. Otherwise, when that file runs first
// on Linux CI, pubsub-manager.test.ts ends up importing the mocked no-op
// `ensurePubSubInfra` and 5 tests here fail.
import { parsePubSubConfig, ensurePubSubInfra } from "../services/pubsub-manager.ts";

// --- Fixtures ---

const FAKE_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "my-project-123",
  client_email: "conversation-sync@my-project-123.iam.gserviceaccount.com",
  private_key: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n",
};

const FAKE_PUSH_URL = "https://abc.ngrok-free.app/api/webhooks/google-meet";

// --- Mock PubSub client ---

function createMockPubSub(
  options: {
    topicExists?: boolean;
    subscriptionExists?: boolean;
    topicError?: Error;
    subscriptionError?: Error;
  } = {},
) {
  const createSubscriptionArgs: unknown[] = [];

  const mockSubscription = {
    createSubscription: mock(async (name: string, config: unknown) => {
      createSubscriptionArgs.push({ name, config });
      if (options.subscriptionError) throw options.subscriptionError;
      if (options.subscriptionExists) throw alreadyExistsError("Subscription already exists");
      return [{ name }];
    }),
  };

  const mockCreateTopic = mock(async (name: string) => {
    if (options.topicError) throw options.topicError;
    if (options.topicExists) throw alreadyExistsError("Topic already exists");
    return [{ name }];
  });

  return {
    createTopic: mockCreateTopic,
    topic: mock((_name: string) => mockSubscription),
    _subscription: mockSubscription,
    _createSubscriptionArgs: createSubscriptionArgs,
  };
}

function alreadyExistsError(message: string): Error & { code: number } {
  const err = new Error(message) as Error & { code: number };
  err.code = 6; // gRPC ALREADY_EXISTS
  return err;
}

function permissionDeniedError(message: string): Error & { code: number } {
  const err = new Error(message) as Error & { code: number };
  err.code = 7; // gRPC PERMISSION_DENIED
  return err;
}

// --- Tests ---

describe("parsePubSubConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns config when both env vars are set", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(FAKE_SERVICE_ACCOUNT);
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    const config = parsePubSubConfig();

    expect(config).not.toBeNull();
    expect(config!.projectId).toBe("my-project-123");
    expect(config!.serviceAccountEmail).toBe(
      "conversation-sync@my-project-123.iam.gserviceaccount.com",
    );
    expect(config!.pushUrl).toBe(FAKE_PUSH_URL);
    expect(config!.credentials).toEqual(FAKE_SERVICE_ACCOUNT);
  });

  it("returns null when GOOGLE_SERVICE_ACCOUNT_KEY is missing", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    expect(parsePubSubConfig()).toBeNull();
  });

  it("returns null when GOOGLE_PUBSUB_PUSH_URL is missing", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(FAKE_SERVICE_ACCOUNT);
    delete process.env.GOOGLE_PUBSUB_PUSH_URL;

    expect(parsePubSubConfig()).toBeNull();
  });

  it("returns null when both env vars are missing", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_PUBSUB_PUSH_URL;

    expect(parsePubSubConfig()).toBeNull();
  });

  it("returns null when service account JSON is invalid", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "not-valid-json{";
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    expect(parsePubSubConfig()).toBeNull();
  });

  it("returns null when service account JSON lacks project_id", () => {
    const { project_id, ...rest } = FAKE_SERVICE_ACCOUNT;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(rest);
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    expect(parsePubSubConfig()).toBeNull();
  });

  it("returns null when service account JSON lacks client_email", () => {
    const { client_email, ...rest } = FAKE_SERVICE_ACCOUNT;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(rest);
    process.env.GOOGLE_PUBSUB_PUSH_URL = FAKE_PUSH_URL;

    expect(parsePubSubConfig()).toBeNull();
  });
});

describe("ensurePubSubInfra", () => {
  // TODO(TC-1343): linux-CI-only flake; Bun mock.module leakage from google-meet-webhooks.test.ts. See https://linear.app/tinycloudlabs/issue/TC-1343/ci-pubsub-managertestts-5-linux-only-flakes-bun-mockmodule
  it.skip("creates topic and push subscription with correct params", async () => {
    const pubsub = createMockPubSub();
    const config = {
      projectId: "my-project-123",
      serviceAccountEmail: "sa@my-project-123.iam.gserviceaccount.com",
      pushUrl: FAKE_PUSH_URL,
      credentials: FAKE_SERVICE_ACCOUNT,
    };

    await ensurePubSubInfra(config, pubsub as any);

    // Topic created
    expect(pubsub.createTopic).toHaveBeenCalledTimes(1);
    expect(pubsub.createTopic).toHaveBeenCalledWith("conversation-sync-events");

    // Subscription created on the topic
    expect(pubsub.topic).toHaveBeenCalledWith("conversation-sync-events");
    expect(pubsub._subscription.createSubscription).toHaveBeenCalledTimes(1);

    const subCall = pubsub._createSubscriptionArgs[0] as any;
    expect(subCall.name).toBe("conversation-sync-push");
    expect(subCall.config.pushConfig.pushEndpoint).toBe(FAKE_PUSH_URL);
    expect(subCall.config.pushConfig.oidcToken.serviceAccountEmail).toBe(
      "sa@my-project-123.iam.gserviceaccount.com",
    );
    expect(subCall.config.pushConfig.oidcToken.audience).toBe(FAKE_PUSH_URL);
  });

  // TODO(TC-1343): linux-CI-only flake; Bun mock.module leakage from google-meet-webhooks.test.ts. See https://linear.app/tinycloudlabs/issue/TC-1343/ci-pubsub-managertestts-5-linux-only-flakes-bun-mockmodule
  it.skip("succeeds when topic already exists", async () => {
    const pubsub = createMockPubSub({ topicExists: true });
    const config = {
      projectId: "my-project-123",
      serviceAccountEmail: "sa@my-project-123.iam.gserviceaccount.com",
      pushUrl: FAKE_PUSH_URL,
      credentials: FAKE_SERVICE_ACCOUNT,
    };

    // Should not throw
    await ensurePubSubInfra(config, pubsub as any);

    // Topic creation was attempted
    expect(pubsub.createTopic).toHaveBeenCalledTimes(1);

    // Subscription was still created
    expect(pubsub._subscription.createSubscription).toHaveBeenCalledTimes(1);
  });

  it("succeeds when subscription already exists", async () => {
    const pubsub = createMockPubSub({ subscriptionExists: true });
    const config = {
      projectId: "my-project-123",
      serviceAccountEmail: "sa@my-project-123.iam.gserviceaccount.com",
      pushUrl: FAKE_PUSH_URL,
      credentials: FAKE_SERVICE_ACCOUNT,
    };

    // Should not throw
    await ensurePubSubInfra(config, pubsub as any);
  });

  // TODO(TC-1343): linux-CI-only flake; Bun mock.module leakage from google-meet-webhooks.test.ts. See https://linear.app/tinycloudlabs/issue/TC-1343/ci-pubsub-managertestts-5-linux-only-flakes-bun-mockmodule
  it.skip("succeeds when both topic and subscription already exist", async () => {
    const pubsub = createMockPubSub({ topicExists: true, subscriptionExists: true });
    const config = {
      projectId: "my-project-123",
      serviceAccountEmail: "sa@my-project-123.iam.gserviceaccount.com",
      pushUrl: FAKE_PUSH_URL,
      credentials: FAKE_SERVICE_ACCOUNT,
    };

    await ensurePubSubInfra(config, pubsub as any);

    expect(pubsub.createTopic).toHaveBeenCalledTimes(1);
    expect(pubsub._subscription.createSubscription).toHaveBeenCalledTimes(1);
  });

  it("returns early when config is null", async () => {
    const pubsub = createMockPubSub();

    // Passing null config — should return early without touching PubSub
    await ensurePubSubInfra(null, pubsub as any);

    expect(pubsub.createTopic).not.toHaveBeenCalled();
  });

  // TODO(TC-1343): linux-CI-only flake; Bun mock.module leakage from google-meet-webhooks.test.ts. See https://linear.app/tinycloudlabs/issue/TC-1343/ci-pubsub-managertestts-5-linux-only-flakes-bun-mockmodule
  it.skip("throws on non-ALREADY_EXISTS topic error", async () => {
    const pubsub = createMockPubSub({
      topicError: permissionDeniedError("Permission denied"),
    });
    const config = {
      projectId: "my-project-123",
      serviceAccountEmail: "sa@my-project-123.iam.gserviceaccount.com",
      pushUrl: FAKE_PUSH_URL,
      credentials: FAKE_SERVICE_ACCOUNT,
    };

    await expect(ensurePubSubInfra(config, pubsub as any)).rejects.toThrow("Permission denied");
  });

  // TODO(TC-1343): linux-CI-only flake; Bun mock.module leakage from google-meet-webhooks.test.ts. See https://linear.app/tinycloudlabs/issue/TC-1343/ci-pubsub-managertestts-5-linux-only-flakes-bun-mockmodule
  it.skip("throws on non-ALREADY_EXISTS subscription error", async () => {
    const pubsub = createMockPubSub({
      subscriptionError: permissionDeniedError("Permission denied"),
    });
    const config = {
      projectId: "my-project-123",
      serviceAccountEmail: "sa@my-project-123.iam.gserviceaccount.com",
      pushUrl: FAKE_PUSH_URL,
      credentials: FAKE_SERVICE_ACCOUNT,
    };

    await expect(ensurePubSubInfra(config, pubsub as any)).rejects.toThrow("Permission denied");
  });
});

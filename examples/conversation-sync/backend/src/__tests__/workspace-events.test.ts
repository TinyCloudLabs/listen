import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  createMeetSubscription,
  checkAndRenewSubscription,
  deleteMeetSubscription,
  type SubscriptionMetadata,
} from "../services/pubsub-manager";

// --- Fixtures ---

const PROJECT_ID = "my-project-123";
const GOOGLE_USER_ID = "1234567890";
const ACCESS_TOKEN = "ya29.fake-access-token";
const SUBSCRIPTION_NAME = "subscriptions/Se1f28abc123";
const WORKSPACE_API = "https://workspaceevents.googleapis.com/v1";

function makeMetadata(overrides: Partial<SubscriptionMetadata> = {}): SubscriptionMetadata {
  return {
    subscriptionName: SUBSCRIPTION_NAME,
    googleUserId: GOOGLE_USER_ID,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- Fetch mock helpers ---

const originalFetch = globalThis.fetch;
let fetchCalls: Array<{ url: string; method: string; headers?: Record<string, string>; body?: any }>;

function mockFetchSequence(responses: Array<{ status: number; body: any }>) {
  fetchCalls = [];
  let callIndex = 0;

  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const headers = init?.headers as Record<string, string> | undefined;
    let body: any;
    if (init?.body) {
      try {
        body = JSON.parse(init.body as string);
      } catch {
        body = init.body;
      }
    }
    fetchCalls.push({ url, method, headers, body });

    if (callIndex >= responses.length) {
      throw new Error(`Unexpected fetch call #${callIndex + 1}: ${method} ${url}`);
    }
    const resp = responses[callIndex++];
    return new Response(JSON.stringify(resp.body), {
      status: resp.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as any;
}

// --- Tests ---

describe("createMeetSubscription", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("creates subscription and returns metadata when operation completes immediately", async () => {
    const expireTime = "2026-04-07T14:00:00Z";
    const createTime = "2026-03-31T14:00:00Z";

    mockFetchSequence([
      {
        status: 200,
        body: {
          name: "operations/op123",
          done: true,
          response: {
            name: SUBSCRIPTION_NAME,
            expireTime,
            createTime,
          },
        },
      },
    ]);

    const result = await createMeetSubscription(PROJECT_ID, GOOGLE_USER_ID, ACCESS_TOKEN, 0);

    expect(result).toEqual({
      subscriptionName: SUBSCRIPTION_NAME,
      googleUserId: GOOGLE_USER_ID,
      expiresAt: expireTime,
      createdAt: createTime,
    });

    // Verify the API call
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(`${WORKSPACE_API}/subscriptions`);
    expect(fetchCalls[0].method).toBe("POST");
    expect(fetchCalls[0].headers?.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(fetchCalls[0].body).toEqual({
      targetResource: `//cloudidentity.googleapis.com/users/${GOOGLE_USER_ID}`,
      eventTypes: ["google.workspace.meet.transcript.v2.fileGenerated"],
      notificationEndpoint: {
        pubsubTopic: `projects/${PROJECT_ID}/topics/conversation-sync-events`,
      },
      payloadOptions: { includeResource: false },
      ttl: "604800s",
    });
  });

  it("polls operation until complete", async () => {
    const expireTime = "2026-04-07T14:00:00Z";

    mockFetchSequence([
      // Initial create returns pending operation
      {
        status: 200,
        body: { name: "operations/op456", done: false },
      },
      // First poll — still pending
      {
        status: 200,
        body: { name: "operations/op456", done: false },
      },
      // Second poll — complete
      {
        status: 200,
        body: {
          name: "operations/op456",
          done: true,
          response: {
            name: SUBSCRIPTION_NAME,
            expireTime,
            createTime: "2026-03-31T14:00:00Z",
          },
        },
      },
    ]);

    const result = await createMeetSubscription(PROJECT_ID, GOOGLE_USER_ID, ACCESS_TOKEN, 0);

    expect(result.subscriptionName).toBe(SUBSCRIPTION_NAME);
    expect(result.expiresAt).toBe(expireTime);
    expect(fetchCalls).toHaveLength(3);
    // Verify poll calls go to the operation URL
    expect(fetchCalls[1].url).toBe(`${WORKSPACE_API}/operations/op456`);
    expect(fetchCalls[2].url).toBe(`${WORKSPACE_API}/operations/op456`);
  });

  it("throws on API error response", async () => {
    mockFetchSequence([
      { status: 403, body: { error: { message: "Permission denied" } } },
    ]);

    await expect(
      createMeetSubscription(PROJECT_ID, GOOGLE_USER_ID, ACCESS_TOKEN, 0),
    ).rejects.toThrow("Failed to create subscription: 403");
  });

  it("throws when operation returns an error", async () => {
    mockFetchSequence([
      {
        status: 200,
        body: {
          name: "operations/op789",
          done: true,
          error: { message: "Quota exceeded" },
        },
      },
    ]);

    await expect(
      createMeetSubscription(PROJECT_ID, GOOGLE_USER_ID, ACCESS_TOKEN, 0),
    ).rejects.toThrow("Create subscription failed: Quota exceeded");
  });

  it("throws on operation poll failure", async () => {
    mockFetchSequence([
      { status: 200, body: { name: "operations/opFail", done: false } },
      { status: 500, body: { error: "Internal error" } },
    ]);

    await expect(
      createMeetSubscription(PROJECT_ID, GOOGLE_USER_ID, ACCESS_TOKEN, 0),
    ).rejects.toThrow("Operation poll failed: 500");
  });
});

describe("checkAndRenewSubscription", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns 'active' when expiry is more than 24 hours away", async () => {
    const metadata = makeMetadata({
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
    });

    const result = await checkAndRenewSubscription(metadata, ACCESS_TOKEN, 0);

    expect(result.status).toBe("active");
    expect(result.metadata).toBeUndefined();
  });

  it("returns 'lapsed' when subscription has already expired", async () => {
    const metadata = makeMetadata({
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
    });

    const result = await checkAndRenewSubscription(metadata, ACCESS_TOKEN, 0);

    expect(result.status).toBe("lapsed");
    expect(result.metadata).toBeUndefined();
  });

  it("renews and returns 'renewed' when expiry is within 24 hours", async () => {
    const metadata = makeMetadata({
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
      createdAt: "2026-03-25T14:00:00Z",
    });

    const newExpireTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    mockFetchSequence([
      {
        status: 200,
        body: {
          name: "operations/renew123",
          done: true,
          response: {
            name: SUBSCRIPTION_NAME,
            expireTime: newExpireTime,
          },
        },
      },
    ]);

    const result = await checkAndRenewSubscription(metadata, ACCESS_TOKEN, 0);

    expect(result.status).toBe("renewed");
    expect(result.metadata).toBeDefined();
    expect(result.metadata!.expiresAt).toBe(newExpireTime);
    expect(result.metadata!.subscriptionName).toBe(SUBSCRIPTION_NAME);
    expect(result.metadata!.googleUserId).toBe(GOOGLE_USER_ID);
    expect(result.metadata!.createdAt).toBe("2026-03-25T14:00:00Z");

    // Verify PATCH call
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toContain(SUBSCRIPTION_NAME);
    expect(fetchCalls[0].url).toContain("updateMask=ttl");
    expect(fetchCalls[0].method).toBe("PATCH");
    expect(fetchCalls[0].body).toEqual({ ttl: "604800s" });
  });

  it("throws on renewal API error", async () => {
    const metadata = makeMetadata({
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
    });

    mockFetchSequence([
      { status: 401, body: { error: { message: "Token expired" } } },
    ]);

    await expect(
      checkAndRenewSubscription(metadata, ACCESS_TOKEN, 0),
    ).rejects.toThrow("Failed to renew subscription: 401");
  });

  it("returns 'lapsed' when expiry is exactly now", async () => {
    const metadata = makeMetadata({
      expiresAt: new Date(Date.now()).toISOString(),
    });

    const result = await checkAndRenewSubscription(metadata, ACCESS_TOKEN, 0);

    expect(result.status).toBe("lapsed");
  });
});

describe("deleteMeetSubscription", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("deletes subscription successfully", async () => {
    const metadata = makeMetadata();

    mockFetchSequence([
      { status: 200, body: {} },
    ]);

    await deleteMeetSubscription(metadata, ACCESS_TOKEN);

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(`${WORKSPACE_API}/${SUBSCRIPTION_NAME}`);
    expect(fetchCalls[0].method).toBe("DELETE");
    expect(fetchCalls[0].headers?.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it("treats 404 as success (already deleted)", async () => {
    const metadata = makeMetadata();

    mockFetchSequence([
      { status: 404, body: { error: { message: "Not found" } } },
    ]);

    // Should not throw
    await deleteMeetSubscription(metadata, ACCESS_TOKEN);
  });

  it("throws on other API errors", async () => {
    const metadata = makeMetadata();

    mockFetchSequence([
      { status: 500, body: { error: { message: "Internal server error" } } },
    ]);

    await expect(
      deleteMeetSubscription(metadata, ACCESS_TOKEN),
    ).rejects.toThrow("Failed to delete subscription: 500");
  });
});

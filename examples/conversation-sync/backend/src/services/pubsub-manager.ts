import { PubSub } from "@google-cloud/pubsub";

const TOPIC_NAME = "conversation-sync-events";
const SUBSCRIPTION_NAME = "conversation-sync-push";

const WORKSPACE_EVENTS_API = "https://workspaceevents.googleapis.com/v1";
const MEET_TRANSCRIPT_EVENT = "google.workspace.meet.transcript.v2.fileGenerated";
const SUBSCRIPTION_TTL = "604800s"; // 7 days
const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SubscriptionMetadata {
  subscriptionName: string;
  googleUserId: string;
  expiresAt: string;
  createdAt: string;
}

export type RenewalStatus = "active" | "renewed" | "lapsed";

export interface RenewalResult {
  status: RenewalStatus;
  metadata?: SubscriptionMetadata;
}

export interface PubSubConfig {
  projectId: string;
  serviceAccountEmail: string;
  pushUrl: string;
  credentials: Record<string, unknown>;
}

/**
 * Parse Pub/Sub configuration from environment variables.
 * Returns null if required env vars are missing or invalid.
 */
export function parsePubSubConfig(): PubSubConfig | null {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const pushUrl = process.env.GOOGLE_PUBSUB_PUSH_URL;

  if (!keyJson || !pushUrl) {
    console.warn("[pubsub] Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_PUBSUB_PUSH_URL — Pub/Sub disabled");
    return null;
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(keyJson);
  } catch {
    console.warn("[pubsub] Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY — Pub/Sub disabled");
    return null;
  }

  const projectId = credentials.project_id;
  const serviceAccountEmail = credentials.client_email;

  if (typeof projectId !== "string" || typeof serviceAccountEmail !== "string") {
    console.warn("[pubsub] Service account JSON missing project_id or client_email — Pub/Sub disabled");
    return null;
  }

  return { projectId, serviceAccountEmail, pushUrl, credentials };
}

/**
 * Ensure Pub/Sub topic and push subscription exist. Idempotent —
 * ignores "already exists" errors (gRPC code 6).
 *
 * @param config - Parsed config, or null to skip. Defaults to parsePubSubConfig().
 * @param client - PubSub client instance. Created from config if not provided.
 */
export async function ensurePubSubInfra(
  config?: PubSubConfig | null,
  client?: PubSub,
): Promise<void> {
  const cfg = config === undefined ? parsePubSubConfig() : config;
  if (!cfg) return;

  const pubsub = client ?? new PubSub({ projectId: cfg.projectId, credentials: cfg.credentials });

  // Create topic (idempotent)
  try {
    await pubsub.createTopic(TOPIC_NAME);
    console.log(`[pubsub] Created topic: ${TOPIC_NAME}`);
  } catch (err: any) {
    if (err.code === 6) {
      console.log(`[pubsub] Topic already exists: ${TOPIC_NAME}`);
    } else {
      throw err;
    }
  }

  // Create push subscription with OIDC auth (idempotent)
  try {
    const topic = pubsub.topic(TOPIC_NAME);
    await topic.createSubscription(SUBSCRIPTION_NAME, {
      pushConfig: {
        pushEndpoint: cfg.pushUrl,
        oidcToken: {
          serviceAccountEmail: cfg.serviceAccountEmail,
          audience: cfg.pushUrl,
        },
      },
    });
    console.log(`[pubsub] Created push subscription: ${SUBSCRIPTION_NAME}`);
  } catch (err: any) {
    if (err.code === 6) {
      console.log(`[pubsub] Push subscription already exists: ${SUBSCRIPTION_NAME}`);
    } else {
      throw err;
    }
  }
}

/**
 * Poll a long-running operation until complete.
 */
async function pollOperation(
  operationName: string,
  accessToken: string,
  pollIntervalMs: number,
  maxAttempts: number,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${WORKSPACE_EVENTS_API}/${operationName}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Operation poll failed: ${res.status} ${res.statusText}`);
    }
    const op = await res.json();
    if (op.done) {
      if (op.error) {
        throw new Error(`Operation failed: ${op.error.message}`);
      }
      return op.response;
    }
    if (pollIntervalMs > 0) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }
  throw new Error(`Operation ${operationName} timed out after ${maxAttempts} attempts`);
}

/**
 * Create a Workspace Events subscription for Google Meet transcript events.
 * Uses the user's OAuth access token to call the Workspace Events API.
 *
 * @param projectId - GCP project ID (for notification endpoint topic path)
 * @param googleUserId - Google user ID from userinfo endpoint
 * @param userAccessToken - User's OAuth access token
 * @param pollIntervalMs - Interval between operation polls (0 for tests)
 */
export async function createMeetSubscription(
  projectId: string,
  googleUserId: string,
  userAccessToken: string,
  pollIntervalMs = 1000,
): Promise<SubscriptionMetadata> {
  const body = {
    targetResource: `//cloudidentity.googleapis.com/users/${googleUserId}`,
    eventTypes: [MEET_TRANSCRIPT_EVENT],
    notificationEndpoint: {
      pubsubTopic: `projects/${projectId}/topics/${TOPIC_NAME}`,
    },
    payloadOptions: {
      includeResource: false,
    },
    ttl: SUBSCRIPTION_TTL,
  };

  const res = await fetch(`${WORKSPACE_EVENTS_API}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create subscription: ${res.status} ${text}`);
  }

  const operation = await res.json();

  let subscription: any;
  if (operation.done) {
    if (operation.error) {
      throw new Error(`Create subscription failed: ${operation.error.message}`);
    }
    subscription = operation.response;
  } else {
    subscription = await pollOperation(operation.name, userAccessToken, pollIntervalMs, 30);
  }

  return {
    subscriptionName: subscription.name,
    googleUserId,
    expiresAt: subscription.expireTime,
    createdAt: subscription.createTime ?? new Date().toISOString(),
  };
}

/**
 * Check subscription status and renew if expiring within 24 hours.
 *
 * @param metadata - Stored subscription metadata
 * @param userAccessToken - User's OAuth access token
 * @param pollIntervalMs - Interval between operation polls (0 for tests)
 */
export async function checkAndRenewSubscription(
  metadata: SubscriptionMetadata,
  userAccessToken: string,
  pollIntervalMs = 1000,
): Promise<RenewalResult> {
  const expiresAt = new Date(metadata.expiresAt).getTime();
  const now = Date.now();

  // Already expired
  if (expiresAt <= now) {
    return { status: "lapsed" };
  }

  // More than 24h remaining — no action needed
  if (expiresAt - now > RENEW_THRESHOLD_MS) {
    return { status: "active" };
  }

  // Within 24h — renew via PATCH
  const res = await fetch(
    `${WORKSPACE_EVENTS_API}/${metadata.subscriptionName}?updateMask=ttl`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: SUBSCRIPTION_TTL }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to renew subscription: ${res.status} ${text}`);
  }

  const operation = await res.json();

  let subscription: any;
  if (operation.done) {
    if (operation.error) {
      throw new Error(`Renew subscription failed: ${operation.error.message}`);
    }
    subscription = operation.response;
  } else {
    subscription = await pollOperation(operation.name, userAccessToken, pollIntervalMs, 30);
  }

  return {
    status: "renewed",
    metadata: {
      subscriptionName: subscription.name,
      googleUserId: metadata.googleUserId,
      expiresAt: subscription.expireTime,
      createdAt: metadata.createdAt,
    },
  };
}

/**
 * Delete a Workspace Events subscription.
 *
 * @param metadata - Stored subscription metadata
 * @param userAccessToken - User's OAuth access token
 */
export async function deleteMeetSubscription(
  metadata: SubscriptionMetadata,
  userAccessToken: string,
): Promise<void> {
  const res = await fetch(`${WORKSPACE_EVENTS_API}/${metadata.subscriptionName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  // 404 = already deleted, treat as success
  if (res.status === 404) {
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete subscription: ${res.status} ${text}`);
  }
}

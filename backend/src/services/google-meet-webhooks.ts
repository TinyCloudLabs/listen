import { parsePubSubConfig, ensurePubSubInfra } from "./pubsub-manager.js";

let _enabled = false;

/**
 * Whether Google Meet webhook features (Pub/Sub push) are enabled.
 * Returns true only after a successful initGoogleMeetWebhooks() call.
 */
export function isGoogleMeetWebhooksEnabled(): boolean {
  return _enabled;
}

/** @internal Reset state for testing. */
export function _resetForTesting(): void {
  _enabled = false;
}

/**
 * Parse Pub/Sub env vars and ensure infrastructure exists.
 * Call once during app startup, after backend identity setup.
 * Logs a warning and returns gracefully if env vars are missing.
 * Throws if ensurePubSubInfra encounters a non-recoverable error.
 */
export async function initGoogleMeetWebhooks(): Promise<void> {
  const config = parsePubSubConfig();
  if (!config) {
    console.warn(
      "[webhooks] Google Meet webhooks disabled — missing or invalid Pub/Sub configuration",
    );
    return;
  }

  await ensurePubSubInfra(config);
  _enabled = true;
  console.log("[webhooks] Google Meet webhooks enabled");
}

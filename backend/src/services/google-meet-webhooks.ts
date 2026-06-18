import { parsePubSubConfig, ensurePubSubInfra } from "./pubsub-manager.js";

let _enabled = false;
let _lastInitError: string | null = null;

/**
 * Whether Google Meet webhook features (Pub/Sub push) are enabled.
 * Returns true only after a successful initGoogleMeetWebhooks() call.
 */
export function isGoogleMeetWebhooksEnabled(): boolean {
  return _enabled;
}

export function getGoogleMeetWebhooksStatus() {
  return {
    enabled: _enabled,
    lastInitError: _lastInitError,
  };
}

/** @internal Reset state for testing. */
export function _resetForTesting(): void {
  _enabled = false;
  _lastInitError = null;
}

/**
 * Parse Pub/Sub env vars and ensure infrastructure exists.
 * Call once during app startup, after backend identity setup.
 * Logs a warning and returns gracefully if env vars are missing.
 * Logs a warning and leaves webhooks disabled if Pub/Sub setup fails.
 */
export async function initGoogleMeetWebhooks(): Promise<void> {
  const config = parsePubSubConfig();
  if (!config) {
    _lastInitError = "Missing or invalid Pub/Sub configuration";
    console.warn(
      "[webhooks] Google Meet webhooks disabled — missing or invalid Pub/Sub configuration",
    );
    return;
  }

  try {
    await ensurePubSubInfra(config);
    _enabled = true;
    _lastInitError = null;
    console.log("[webhooks] Google Meet webhooks enabled");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    _lastInitError = message;
    console.warn(`[webhooks] Google Meet webhooks disabled — Pub/Sub setup failed: ${message}`);
  }
}

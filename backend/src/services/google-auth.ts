const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
];
const SCOPE = GOOGLE_SCOPES.join(" ");

// ── Types ────────────────────────────────────────────────────────────

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// ── Errors ───────────────────────────────────────────────────────────

export class GoogleAuthRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthRevokedError";
  }
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Build the Google OAuth consent URL.
 */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Google token exchange failed: ${err.error_description ?? err.error}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

/**
 * Refresh an expired access token. Throws GoogleAuthRevokedError if the
 * refresh token has been revoked or is otherwise invalid.
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    if (err.error === "invalid_grant") {
      throw new GoogleAuthRevokedError(err.error_description ?? "Token revoked or expired");
    }
    throw new Error(`Google token refresh failed: ${err.error_description ?? err.error}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

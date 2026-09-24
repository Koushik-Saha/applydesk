import { google } from "googleapis";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

// PROJECT_SPEC.md §4.8, §10 — drive.file only: the app can see only files
// it creates itself. No email/profile scope requested here — the
// connected account is definitionally the signed-in owner (every route
// that reaches this is already behind requireOwner()), so we reuse the
// session's own email instead of asking Google for it again.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI,
  );
}

// PROJECT_SPEC.md §10 "Google OAuth gotcha" — access_type offline +
// prompt=consent guarantees a refresh token on every connect, not just the
// very first one (Google otherwise omits it on repeat consents).
export function getAuthUrl(state: string): string {
  return createOAuth2Client().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [DRIVE_SCOPE],
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await createOAuth2Client().getToken(code);
  return tokens;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth/require-owner";
import { exchangeCodeForTokens } from "@/lib/google/client";
import { saveConnection, ensureRootFolder } from "@/lib/google/service";

// PROJECT_SPEC.md §9, §10 — GET /api/google/callback
export async function GET(request: Request) {
  const session = await requireOwner();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  if (errorParam || !code) {
    const reason = encodeURIComponent(errorParam ?? "missing_code");
    return NextResponse.redirect(`${baseUrl}/settings?google_error=${reason}`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}/settings?google_error=state_mismatch`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Offline access with prompt=consent should return refresh_token
      return NextResponse.redirect(
        `${baseUrl}/settings?google_error=no_refresh_token`,
      );
    }

    await saveConnection(session.user.id, session.user.email, tokens.refresh_token);

    // Create the "ApplyDesk" root folder in Google Drive if it doesn't exist
    try {
      await ensureRootFolder(session.user.id);
    } catch (err) {
      console.error("Failed to initialize ApplyDesk root folder in Google Drive:", err);
    }

    return NextResponse.redirect(`${baseUrl}/settings?google=connected`);
  } catch (error) {
    console.error("Google OAuth token exchange failed:", error);
    return NextResponse.redirect(`${baseUrl}/settings?google_error=exchange_failed`);
  }
}

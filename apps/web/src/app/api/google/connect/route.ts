import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireOwner } from "@/lib/auth/require-owner";
import { getAuthUrl } from "@/lib/google/client";

// PROJECT_SPEC.md §9, §10 — GET /api/google/connect "OAuth start"
// Requests drive.file scope with access_type: offline and prompt: consent.
export async function GET() {
  await requireOwner();

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 60 * 10, // 10 minutes
  });

  const authUrl = getAuthUrl(state);
  return NextResponse.redirect(authUrl);
}

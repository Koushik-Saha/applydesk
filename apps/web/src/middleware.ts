import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// PROJECT_SPEC.md §10 — redirect signed-out users to /login; security
// headers + a basic CSP on every response. This is a cheap cookie-presence
// check (no DB hit); requireOwner() does the authoritative session +
// allowlist check in the page/route handler itself.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export function middleware(request: NextRequest) {
  const isSignedIn = Boolean(getSessionCookie(request));

  if (!isSignedIn) {
    const url = new URL("/login", request.url);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - /login (the sign-in page itself)
     * - /api/auth/* (Better Auth's own routes)
     * - /api/ext/* (extension routes; bearer-token auth, not cookies)
     * - Next internals and static assets
     */
    "/((?!login|api/auth|api/ext|_next/static|_next/image|favicon.ico).*)",
  ],
};

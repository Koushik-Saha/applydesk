import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { checkRateLimit } from "@/lib/security/rate-limit";

// PROJECT_SPEC.md §10 — redirect signed-out users to /login; security
// headers + a basic CSP on every response. This is a cheap cookie-presence
// check (no DB hit); requireOwner() does the authoritative session +
// allowlist check in the page/route handler itself.
//
// 'unsafe-eval' is only needed for dev-mode HMR (webpack/Turbopack eval'd
// module wrappers) — production builds don't eval, so it's dropped there.
// 'unsafe-inline' stays in both: Next's App Router still ships an inline
// bootstrap script with no nonce wired through next.config.
const BASE_CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
];

const CSP = [...BASE_CSP_DIRECTIVES, "frame-ancestors 'none'"].join("; ");

// The PDF preview tab embeds /api/documents/:id/pdf in an <iframe> on the
// same page — `X-Frame-Options: DENY` / `frame-ancestors 'none'` block that
// even though the frame and the page share an origin, since DENY means "no
// framing at all," not "no cross-origin framing." Every other route keeps
// the strict default; only this one relaxes to same-origin framing.
const FRAMEABLE_PATH = /^\/api\/documents\/[^/]+\/pdf$/;
const FRAMEABLE_CSP = [...BASE_CSP_DIRECTIVES, "frame-ancestors 'self'"].join("; ");

function withSecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  const frameable = FRAMEABLE_PATH.test(pathname);
  response.headers.set("Content-Security-Policy", frameable ? FRAMEABLE_CSP : CSP);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", frameable ? "SAMEORIGIN" : "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PROJECT_SPEC.md §10 & DESIGN.md §10:
  // CORS on /api/ext/* allowing only chrome-extension://<EXTENSION_ID>
  if (pathname.startsWith("/api/ext")) {
    const origin = request.headers.get("origin");
    const configuredExtensionId = process.env.EXTENSION_ID?.trim();
    const allowedOrigin = configuredExtensionId
      ? `chrome-extension://${configuredExtensionId}`
      : null;

    if (origin) {
      if (allowedOrigin && origin !== allowedOrigin) {
        return new NextResponse(
          JSON.stringify({ error: { message: "CORS origin forbidden.", code: "forbidden" } }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      if (!allowedOrigin && !origin.startsWith("chrome-extension://")) {
        return new NextResponse(
          JSON.stringify({ error: { message: "CORS origin forbidden.", code: "forbidden" } }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const effectiveOrigin = origin ?? allowedOrigin ?? "*";

    if (request.method === "OPTIONS") {
      const headers = new Headers({
        "Access-Control-Allow-Origin": effectiveOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
      });
      return new NextResponse(null, { status: 204, headers });
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const rateLimitKey = `ext_${authHeader || clientIp}`;
    const rateCheck = checkRateLimit(rateLimitKey, { maxRequests: 60, windowMs: 60000 });

    if (!rateCheck.success) {
      const headers = new Headers({
        "Access-Control-Allow-Origin": effectiveOrigin,
        "Retry-After": Math.max(1, Math.ceil((rateCheck.resetAt - Date.now()) / 1000)).toString(),
        "Content-Type": "application/json",
      });
      return new NextResponse(
        JSON.stringify({
          error: {
            message: "Rate limit exceeded. Please try again in a moment.",
            code: "rate_limited",
          },
        }),
        { status: 429, headers },
      );
    }

    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", effectiveOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.headers.set("X-RateLimit-Remaining", rateCheck.remaining.toString());
    return withSecurityHeaders(response, pathname);
  }

  const isSignedIn = Boolean(getSessionCookie(request));

  if (!isSignedIn) {
    const url = new URL("/login", request.url);
    return withSecurityHeaders(NextResponse.redirect(url), pathname);
  }

  return withSecurityHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - /login (the sign-in page itself)
     * - /api/auth/* (Better Auth's own routes)
     * - /api/tasks/* (polled by both the site and the extension; bearer or
     *   cookie, checked in the route handler via requireOwnerOrExtensionToken)
     * - Next internals and static assets
     */
    "/((?!login|api/auth|api/tasks|_next/static|_next/image|favicon.ico).*)",
  ],
};

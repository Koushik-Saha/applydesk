import { headers } from "next/headers";
import { auth } from "./config";
import { isOwnerEmail } from "./allowlist";
import { AuthError } from "./errors";

// CLAUDE.md rule 5 — every page/route handler calls this. Middleware already
// redirects a signed-out browser to /login before this runs; this is the
// authoritative re-check (also covers non-browser callers with a cookie but
// no owner session, which middleware's cookie-presence check can't catch).
export async function requireOwner() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isOwnerEmail(session.user.email)) {
    throw new AuthError("unauthorized", "Sign-in required.", 401);
  }
  return session;
}

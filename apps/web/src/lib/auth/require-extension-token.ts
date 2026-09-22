import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { apiTokens } from "../db/schema";
import { hashToken } from "./tokens";
import { AuthError } from "./errors";

// CLAUDE.md rule 5 / PROJECT_SPEC.md §10 — `Authorization: Bearer ad_<token>`
// on every /api/ext/* route. Looks up the token by its SHA-256 hash (the raw
// token is never stored), rejects revoked tokens, and updates lastUsedAt.
export async function requireExtensionToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthError("unauthorized", "Missing bearer token.", 401);
  }

  const [row] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hashToken(token)))
    .limit(1);

  if (!row || row.revokedAt) {
    throw new AuthError("unauthorized", "Invalid or revoked token.", 401);
  }

  await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.id));

  return { ownerId: row.ownerId, tokenId: row.id };
}

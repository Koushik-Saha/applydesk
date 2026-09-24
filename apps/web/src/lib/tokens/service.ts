import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apiTokens } from "@/lib/db/schema";
import { generateExtensionToken } from "@/lib/auth/tokens";

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date | null;
}

export interface CreatedApiToken {
  id: string;
  name: string;
  prefix: string;
  token: string;
  createdAt: Date | null;
}

/**
 * List all extension tokens belonging to the owner.
 * Note: tokenHash is never returned.
 */
export async function listTokens(ownerId: string): Promise<ApiTokenSummary[]> {
  const rows = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      lastUsedAt: apiTokens.lastUsedAt,
      revokedAt: apiTokens.revokedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.ownerId, ownerId))
    .orderBy(desc(apiTokens.createdAt));

  return rows;
}

/**
 * Generate a new extension token.
 * PROJECT_SPEC.md §10: Raw token is returned ONCE upon creation and never stored.
 * Only the SHA-256 hash and display prefix are persisted.
 */
export async function createToken(ownerId: string, name: string): Promise<CreatedApiToken> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Token name is required");
  }

  const { token, prefix, hash } = generateExtensionToken();

  const [row] = await db
    .insert(apiTokens)
    .values({
      ownerId,
      name: trimmedName,
      prefix,
      tokenHash: hash,
    })
    .returning({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      createdAt: apiTokens.createdAt,
    });

  return {
    id: row!.id,
    name: row!.name,
    prefix: row!.prefix,
    token, // Only revealed here
    createdAt: row!.createdAt,
  };
}

/**
 * Revoke an extension token immediately.
 */
export async function revokeToken(ownerId: string, tokenId: string): Promise<boolean> {
  const result = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.ownerId, ownerId)))
    .returning({ id: apiTokens.id });

  return result.length > 0;
}

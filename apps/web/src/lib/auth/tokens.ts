import { randomBytes, createHash } from "node:crypto";

const TOKEN_PREFIX = "ad_";

// PROJECT_SPEC.md §10 — "random 32 bytes, shown once, stored as SHA-256
// hash, prefix kept for display."
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateExtensionToken(): { token: string; prefix: string; hash: string } {
  const secret = randomBytes(32).toString("hex");
  const token = `${TOKEN_PREFIX}${secret}`;
  return {
    token,
    prefix: token.slice(0, TOKEN_PREFIX.length + 8),
    hash: hashToken(token),
  };
}

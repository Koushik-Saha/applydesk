// CLAUDE.md rule 5 — the entire allowlist is one email, case-insensitively
// (Google account emails are not case-sensitive in practice).
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL;
  if (!owner || !email) return false;
  return email.trim().toLowerCase() === owner.trim().toLowerCase();
}

import type { MasterProfile } from "./schemas/master-profile";

function normalize(term: string): string {
  return term.trim().toLowerCase();
}

// Every skill/tool term that shows up anywhere in the profile: the explicit
// skills list, and every bullet's own tagged skills (experiences + projects).
function profileTermSet(profile: MasterProfile): Set<string> {
  const terms = new Set<string>();
  for (const skill of profile.skills) terms.add(normalize(skill.name));
  for (const exp of profile.experiences) {
    for (const bullet of exp.bullets) for (const skill of bullet.skills) terms.add(normalize(skill));
  }
  for (const project of profile.projects) {
    for (const bullet of project.bullets) for (const skill of bullet.skills) terms.add(normalize(skill));
  }
  return terms;
}

function allBulletText(profile: MasterProfile): string {
  const chunks: string[] = [profile.summary];
  for (const exp of profile.experiences) for (const b of exp.bullets) chunks.push(b.text);
  for (const project of profile.projects) for (const b of project.bullets) chunks.push(b.text);
  return chunks.join("\n").toLowerCase();
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface KeywordMatchResult {
  found: string[];
  missing: string[];
}

// Shared core: a keyword counts as found if it's an exact (case-insensitive)
// match against one of `terms` (tagged skills), or appears as a whole
// word/phrase in `text` — catches real mentions without the false positives
// of loose substring matching (e.g. "Go" inside "Google"). Used both for the
// pre-score (against the full master profile) and the tailored resume's
// post-score (§4.4 step 5, "before -> after" coverage) against just what
// actually made it into that document.
export function matchKeywordsInText(
  keywords: string[],
  text: string,
  terms: Set<string> = new Set(),
): KeywordMatchResult {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    const normalized = normalize(keyword);
    if (!normalized) continue;
    const isFound =
      terms.has(normalized) || new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i").test(lowerText);
    (isFound ? found : missing).push(keyword);
  }

  return { found, missing };
}

// PROJECT_SPEC.md §4.3 — "keywords found in profile / keywords.length."
export function matchKeywords(keywords: string[], profile: MasterProfile): KeywordMatchResult {
  return matchKeywordsInText(keywords, allBulletText(profile), profileTermSet(profile));
}

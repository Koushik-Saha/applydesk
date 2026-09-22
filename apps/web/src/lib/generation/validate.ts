import type { MasterProfile, Violation } from "@applydesk/shared";

// CLAUDE.md rule 2 — "no invented facts." This module never talks to the
// model; it only checks AI output against the profile it was derived from.

const SPELLED_OUT_NUMBERS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
};

// Digit sequences after stripping thousands separators, plus spelled-out
// small numbers ("six years" -> "6") normalized to the same form — a model
// asked not to invent a number could still slip one in as a word instead of
// a digit, so this doesn't rely on prompt wording alone. A number "counts
// as present" in a source if the same normalized token appears there,
// regardless of surrounding formatting — deliberately format-agnostic, not
// unit-aware.
export function extractNumberTokens(text: string): string[] {
  const digitMatches = text.match(/\d[\d,]*(\.\d+)?/g) ?? [];
  const wordMatches = text.match(/\b[a-z]+\b/gi) ?? [];
  return [
    ...digitMatches.map((m) => m.replace(/,/g, "")),
    ...wordMatches
      .map((w) => SPELLED_OUT_NUMBERS[w.toLowerCase()])
      .filter((n): n is string => !!n),
  ];
}

export interface ResumeBulletValidationResult {
  violations: Violation[];
  invalidBulletIndexes: number[];
}

// PROJECT_SPEC.md §4.4 step 3 — every output bullet has >=1 valid source id,
// and every number/percentage/dollar amount in it appears in its sources.
export function validateResumeBullets(
  bullets: { sourceBulletIds: string[]; text: string }[],
  sourceBulletsById: Map<string, string>,
): ResumeBulletValidationResult {
  const violations: Violation[] = [];
  const invalidBulletIndexes = new Set<number>();

  bullets.forEach((bullet, index) => {
    if (bullet.sourceBulletIds.length === 0) {
      violations.push({
        code: "no-source",
        message: `Bullet ${index + 1} has no source bullet ids.`,
        bulletIndex: index,
      });
      invalidBulletIndexes.add(index);
      return;
    }

    const sourceTexts: string[] = [];
    for (const id of bullet.sourceBulletIds) {
      const text = sourceBulletsById.get(id);
      if (!text) {
        violations.push({
          code: "invalid-source-id",
          message: `Bullet ${index + 1} cites unknown source id "${id}".`,
          bulletIndex: index,
        });
        invalidBulletIndexes.add(index);
      } else {
        sourceTexts.push(text);
      }
    }

    const sourceNumberTokens = new Set(sourceTexts.flatMap(extractNumberTokens));
    for (const token of extractNumberTokens(bullet.text)) {
      if (!sourceNumberTokens.has(token)) {
        violations.push({
          code: "invented-number",
          message: `Bullet ${index + 1} contains "${token}," which doesn't appear in its source bullets.`,
          bulletIndex: index,
        });
        invalidBulletIndexes.add(index);
      }
    }
  });

  return { violations, invalidBulletIndexes: [...invalidBulletIndexes].sort((a, b) => a - b) };
}

export interface SkillValidationResult {
  violations: Violation[];
  invalidSkills: string[];
}

// PROJECT_SPEC.md §4.4 step 3 — "skills in the skills list all exist in my
// profile." Checked against the explicit skills list and every bullet's
// own tagged skills, case-insensitively.
export function validateSkills(skills: string[], profile: MasterProfile): SkillValidationResult {
  const known = new Set<string>();
  for (const skill of profile.skills) known.add(skill.name.trim().toLowerCase());
  for (const exp of profile.experiences) {
    for (const bullet of exp.bullets) for (const skill of bullet.skills) known.add(skill.trim().toLowerCase());
  }
  for (const project of profile.projects) {
    for (const bullet of project.bullets) for (const skill of bullet.skills) known.add(skill.trim().toLowerCase());
  }

  const invalidSkills = skills.filter((skill) => !known.has(skill.trim().toLowerCase()));
  const violations = invalidSkills.map((skill) => ({
    code: "unknown-skill",
    message: `Skill "${skill}" does not exist in the profile.`,
  }));

  return { violations, invalidSkills };
}

// PROJECT_SPEC.md §4.5 — "at most 2 accomplishments (from real bullets,
// same validator)." Reuses the same id + number checks as the resume
// bullets, applied to the letter body as a whole.
export function validateCoverLetter(
  body: string,
  referencedBulletIds: string[],
  sourceBulletsById: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  if (referencedBulletIds.length > 2) {
    violations.push({
      code: "too-many-accomplishments",
      message: `Cover letter references ${referencedBulletIds.length} accomplishments; at most 2 allowed.`,
    });
  }

  const sourceTexts: string[] = [];
  for (const id of referencedBulletIds) {
    const text = sourceBulletsById.get(id);
    if (!text) {
      violations.push({ code: "invalid-source-id", message: `Cover letter cites unknown source id "${id}".` });
    } else {
      sourceTexts.push(text);
    }
  }

  const sourceNumberTokens = new Set(sourceTexts.flatMap(extractNumberTokens));
  for (const token of extractNumberTokens(body)) {
    if (!sourceNumberTokens.has(token)) {
      violations.push({
        code: "invented-number",
        message: `Cover letter contains "${token}," which doesn't appear in the referenced bullets.`,
      });
    }
  }

  return violations;
}

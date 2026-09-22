import type { LintIssue } from "@applydesk/shared";

// PROJECT_SPEC.md §4.6 — style guide enforced as code, not left to the
// model's judgment. Thresholds below are the "over 2" / "over" language
// from the spec, made concrete.
const MAX_BULLET_LINES = 2;
const CHARS_PER_LINE = 100; // rough width of one resume bullet line
const MAX_SAME_STARTING_VERB = 2;
const MAX_EM_DASHES_PER_BULLET = 1;

function firstWord(text: string): string {
  return (text.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

function countOccurrences(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

// PROJECT_SPEC.md §4.4 step 4 — banned phrases, >2 bullets starting with the
// same verb, bullets over 2 lines, em-dash overuse, and (from §4.6) no
// exclamation marks.
export function lintResumeBullets(bullets: string[], bannedPhrases: string[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const lowerBanned = bannedPhrases.map((p) => p.toLowerCase());

  bullets.forEach((text, index) => {
    const lower = text.toLowerCase();

    for (const phrase of lowerBanned) {
      if (phrase && lower.includes(phrase)) {
        issues.push({ code: "banned-phrase", message: `Bullet ${index + 1} uses banned phrase "${phrase}."`, bulletIndex: index });
      }
    }

    if (text.length > MAX_BULLET_LINES * CHARS_PER_LINE) {
      issues.push({ code: "bullet-too-long", message: `Bullet ${index + 1} is longer than ${MAX_BULLET_LINES} lines.`, bulletIndex: index });
    }

    const emDashes = countOccurrences(text, /—/g);
    if (emDashes > MAX_EM_DASHES_PER_BULLET) {
      issues.push({ code: "em-dash-overuse", message: `Bullet ${index + 1} uses ${emDashes} em dashes.`, bulletIndex: index });
    }

    if (text.includes("!")) {
      issues.push({ code: "exclamation-mark", message: `Bullet ${index + 1} contains an exclamation mark.`, bulletIndex: index });
    }
  });

  const verbCounts = new Map<string, number[]>();
  bullets.forEach((text, index) => {
    const verb = firstWord(text);
    if (!verb) return;
    const indexes = verbCounts.get(verb) ?? [];
    indexes.push(index);
    verbCounts.set(verb, indexes);
  });
  for (const [verb, indexes] of verbCounts) {
    if (indexes.length > MAX_SAME_STARTING_VERB) {
      issues.push({
        code: "repeated-starting-verb",
        message: `${indexes.length} bullets start with "${verb}" (max ${MAX_SAME_STARTING_VERB}).`,
      });
    }
  }

  return issues;
}

// PROJECT_SPEC.md §4.5 — "same humanize + lint pass" for the cover letter.
// No per-bullet checks; banned phrases, em dashes, and exclamation marks
// are checked over the whole body.
export function lintCoverLetter(body: string, bannedPhrases: string[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const lower = body.toLowerCase();

  for (const phrase of bannedPhrases.map((p) => p.toLowerCase())) {
    if (phrase && lower.includes(phrase)) {
      issues.push({ code: "banned-phrase", message: `Cover letter uses banned phrase "${phrase}."` });
    }
  }

  const emDashes = countOccurrences(body, /—/g);
  if (emDashes > MAX_EM_DASHES_PER_BULLET) {
    issues.push({ code: "em-dash-overuse", message: `Cover letter uses ${emDashes} em dashes.` });
  }

  if (body.includes("!")) {
    issues.push({ code: "exclamation-mark", message: "Cover letter contains an exclamation mark." });
  }

  return issues;
}

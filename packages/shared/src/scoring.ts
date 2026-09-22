// PROJECT_SPEC.md §4.3 step 3 — score is computed in code, deterministically,
// from AI-extracted evidence. The model never outputs the final score.
export type RequirementStatus = "met" | "partial" | "missing";

export interface ScoreInput {
  mustHaveStatuses: RequirementStatus[];
  niceToHaveStatuses: RequirementStatus[];
  keywordsFound: number;
  keywordsTotal: number;
}

export type ScoreBand = "Strong" | "Good" | "Stretch" | "Weak";

export interface ScoreBreakdown {
  mustRatio: number;
  niceRatio: number;
  keywordRatio: number;
  score: number;
  band: ScoreBand;
}

function ratioFromStatuses(statuses: RequirementStatus[]): number {
  // "(met + 0.5 x partial) / length" — vacuously 1.0 when there's nothing to
  // satisfy (mirrors the spec's explicit "1.0 if none listed" for niceRatio;
  // applied symmetrically to mustHave since the formula divides by zero
  // otherwise).
  if (statuses.length === 0) return 1;
  const met = statuses.filter((s) => s === "met").length;
  const partial = statuses.filter((s) => s === "partial").length;
  return (met + 0.5 * partial) / statuses.length;
}

export function bandForScore(score: number): ScoreBand {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 50) return "Stretch";
  return "Weak";
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const mustRatio = ratioFromStatuses(input.mustHaveStatuses);
  const niceRatio = ratioFromStatuses(input.niceToHaveStatuses);
  // Zero keywords extracted is an edge case (nothing to find, not the
  // candidate's fault) — treated the same as "nothing to satisfy": 1.0.
  const keywordRatio = input.keywordsTotal === 0 ? 1 : input.keywordsFound / input.keywordsTotal;

  const score = Math.round(100 * (0.7 * mustRatio + 0.2 * niceRatio + 0.1 * keywordRatio));

  return { mustRatio, niceRatio, keywordRatio, score, band: bandForScore(score) };
}

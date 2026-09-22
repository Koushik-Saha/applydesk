import type { Violation } from "@applydesk/shared";
import { generateStructured } from "@/lib/ai/client";
import {
  coverLetterResultSchema,
  GENERATE_COVER_LETTER_SYSTEM_PROMPT,
  type CoverLetterResult,
} from "@/lib/ai/prompts/job-generate";
import type { Requirements } from "@/lib/ai/prompts/job-analyze";
import { validateCoverLetter } from "./validate";

export interface CoverLetterDraftOutcome {
  greeting: string;
  paragraphs: string[];
  signOff: string;
  referencedBulletIds: string[];
  originalKept: boolean;
  retried: boolean;
  initialViolations: Violation[];
}

function buildCoverLetterInput(params: {
  requirements: Requirements;
  company: string;
  jobTitle: string;
  candidateName: string;
  candidateSummary: string;
  availableBullets: { id: string; text: string }[];
  whyCompanyNote?: string;
}): string {
  return JSON.stringify({
    company: params.company,
    jobTitle: params.jobTitle,
    candidateName: params.candidateName,
    candidateSummary: params.candidateSummary,
    requirements: {
      mustHave: params.requirements.mustHave,
      responsibilities: params.requirements.responsibilities,
    },
    availableBullets: params.availableBullets,
    whyCompanyNote: params.whyCompanyNote,
  });
}

async function callCoverLetter(input: string, model: string, jobId?: string): Promise<CoverLetterResult> {
  const { data } = await generateStructured({
    step: "generate_cover_letter",
    model,
    system: GENERATE_COVER_LETTER_SYSTEM_PROMPT,
    input,
    schema: coverLetterResultSchema,
    jobId,
  });
  return data;
}

// A neutral fallback for the rare case validation still fails after the
// retry — no spec-defined fallback exists for cover letters (unlike resume
// bullets, which fall back to original text), so this stays intentionally
// fact-free and free of every banned phrase in PROJECT_SPEC.md §4.6.
const SAFE_FALLBACK_PARAGRAPH =
  "Thank you for considering my application. My background lines up with what you're looking for, and I'd welcome the chance to discuss how I can contribute.";

// PROJECT_SPEC.md §4.5 — draft, validate, one retry with violations, then a
// safe fallback if it still fails.
export async function runCoverLetterDraft(params: {
  requirements: Requirements;
  company: string;
  jobTitle: string;
  candidateName: string;
  candidateSummary: string;
  availableBullets: { id: string; text: string }[];
  whyCompanyNote?: string;
  model: string;
  jobId?: string;
}): Promise<CoverLetterDraftOutcome> {
  const sourceBulletsById = new Map(params.availableBullets.map((b) => [b.id, b.text]));
  const input = buildCoverLetterInput(params);

  let result = await callCoverLetter(input, params.model, params.jobId);
  let violations = validateCoverLetter(result.paragraphs.join("\n\n"), result.referencedBulletIds, sourceBulletsById);
  const initialViolations = violations;
  let retried = false;

  if (violations.length > 0) {
    retried = true;
    const retryInput = `${input}\n\nYour previous response had these problems. Regenerate a corrected, complete response that fixes them:\n${violations.map((v) => `- ${v.message}`).join("\n")}`;
    result = await callCoverLetter(retryInput, params.model, params.jobId);
    violations = validateCoverLetter(result.paragraphs.join("\n\n"), result.referencedBulletIds, sourceBulletsById);
  }

  if (violations.length > 0) {
    return {
      greeting: result.greeting,
      paragraphs: [SAFE_FALLBACK_PARAGRAPH],
      signOff: result.signOff,
      referencedBulletIds: [],
      originalKept: true,
      retried,
      initialViolations,
    };
  }

  return {
    greeting: result.greeting,
    paragraphs: result.paragraphs,
    signOff: result.signOff,
    referencedBulletIds: result.referencedBulletIds,
    originalKept: false,
    retried,
    initialViolations,
  };
}

import type { LintIssue } from "@applydesk/shared";
import { generateStructured } from "@/lib/ai/client";
import {
  HUMANIZE_COVER_LETTER_SYSTEM_PROMPT,
  HUMANIZE_RESUME_SYSTEM_PROMPT,
  humanizeCoverLetterResultSchema,
  humanizeResumeResultSchema,
} from "@/lib/ai/prompts/job-generate";
import { extractNumberTokens } from "./validate";
import { lintCoverLetter, lintResumeBullets } from "./lint";

export function renderBannedPhrasesPrompt(template: string, bannedPhrases: string[]): string {
  return template.replace("{{bannedPhrases}}", bannedPhrases.join(", ") || "(none configured)");
}

// Defensive: the humanize prompt asks for exactly one output per input, in
// order, but nothing guarantees it. Missing entries fall back to the
// pre-humanize (already fact-checked) text rather than dropping content.
export function alignToInputLength(returned: string[], original: string[]): string[] {
  return original.map((text, i) => returned[i] ?? text);
}

// A humanize pass can reword a bullet in ways that accidentally introduce a
// number the original never had (CLAUDE.md rule 2 applies here too, not
// just at the rewrite step). Any humanized text with a number token absent
// from its pre-humanize version reverts to that pre-humanize text — already
// fact-checked against the master profile, so still safe.
export function safeguardNumbers(humanized: string[], preHumanize: string[]): string[] {
  return humanized.map((text, i) => {
    const preText = preHumanize[i];
    if (preText === undefined) return text;
    const preTokens = new Set(extractNumberTokens(preText));
    const invented = extractNumberTokens(text).some((token) => !preTokens.has(token));
    return invented ? preText : text;
  });
}

export interface HumanizeResumeOutcome {
  summary: string;
  bullets: string[];
  warnings: LintIssue[];
  retried: boolean;
}

async function callHumanizeResume(input: string, model: string, bannedPhrases: string[], jobId?: string) {
  const { data } = await generateStructured({
    step: "humanize_resume",
    model,
    system: renderBannedPhrasesPrompt(HUMANIZE_RESUME_SYSTEM_PROMPT, bannedPhrases),
    input,
    schema: humanizeResumeResultSchema,
    jobId,
  });
  return data;
}

// PROJECT_SPEC.md §4.4 step 4 — humanize, lint, one retry, then warnings.
export async function runHumanizeResume(params: {
  summary: string;
  bullets: string[];
  voiceSamples: string[];
  bannedPhrases: string[];
  model: string;
  jobId?: string;
}): Promise<HumanizeResumeOutcome> {
  const { summary, bullets, voiceSamples, bannedPhrases, model, jobId } = params;
  const input = JSON.stringify({ summary, bullets, voiceSamples });

  let result = await callHumanizeResume(input, model, bannedPhrases, jobId);
  let humanizedBullets = safeguardNumbers(alignToInputLength(result.bullets, bullets), bullets);
  let warnings = lintResumeBullets(humanizedBullets, bannedPhrases);
  let retried = false;

  if (warnings.length > 0) {
    retried = true;
    const retryInput = `${input}\n\nYour previous response had these style issues. Regenerate a corrected response that fixes them:\n${warnings.map((w) => `- ${w.message}`).join("\n")}`;
    result = await callHumanizeResume(retryInput, model, bannedPhrases, jobId);
    humanizedBullets = safeguardNumbers(alignToInputLength(result.bullets, bullets), bullets);
    warnings = lintResumeBullets(humanizedBullets, bannedPhrases);
  }

  return { summary: result.summary, bullets: humanizedBullets, warnings, retried };
}

export interface HumanizeCoverLetterOutcome {
  paragraphs: string[];
  warnings: LintIssue[];
  retried: boolean;
}

async function callHumanizeCoverLetter(input: string, model: string, bannedPhrases: string[], jobId?: string) {
  const { data } = await generateStructured({
    step: "humanize_cover_letter",
    model,
    system: renderBannedPhrasesPrompt(HUMANIZE_COVER_LETTER_SYSTEM_PROMPT, bannedPhrases),
    input,
    schema: humanizeCoverLetterResultSchema,
    jobId,
  });
  return data;
}

export async function runHumanizeCoverLetter(params: {
  paragraphs: string[];
  voiceSamples: string[];
  bannedPhrases: string[];
  model: string;
  jobId?: string;
}): Promise<HumanizeCoverLetterOutcome> {
  const { paragraphs, voiceSamples, bannedPhrases, model, jobId } = params;
  const input = JSON.stringify({ paragraphs, voiceSamples });

  let result = await callHumanizeCoverLetter(input, model, bannedPhrases, jobId);
  let humanizedParagraphs = safeguardNumbers(alignToInputLength(result.paragraphs, paragraphs), paragraphs);
  let warnings = lintCoverLetter(humanizedParagraphs.join("\n\n"), bannedPhrases);
  let retried = false;

  if (warnings.length > 0) {
    retried = true;
    const retryInput = `${input}\n\nYour previous response had these style issues. Regenerate a corrected response that fixes them:\n${warnings.map((w) => `- ${w.message}`).join("\n")}`;
    result = await callHumanizeCoverLetter(retryInput, model, bannedPhrases, jobId);
    humanizedParagraphs = safeguardNumbers(alignToInputLength(result.paragraphs, paragraphs), paragraphs);
    warnings = lintCoverLetter(humanizedParagraphs.join("\n\n"), bannedPhrases);
  }

  return { paragraphs: humanizedParagraphs, warnings, retried };
}

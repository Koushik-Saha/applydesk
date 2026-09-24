import { z } from "zod";

export const PROMPT_VERSION = "job-generate@3";

// PROJECT_SPEC.md §4.4 step 2 — rewrite pass output. `sourceBulletIds` is
// validated by lib/generation/validate.ts, never trusted as-is.
export const rewriteResultSchema = z.object({
  summary: z.string().min(1),
  bullets: z.array(
    z.object({
      sourceBulletIds: z.array(z.string()).min(1),
      text: z.string().min(1),
    }),
  ),
  skills: z.array(z.string()).default([]),
});
export type RewriteResult = z.infer<typeof rewriteResultSchema>;

export const REWRITE_RESUME_SYSTEM_PROMPT = `You make small, targeted keyword edits to a candidate's resume bullets for a specific job posting. This is a light edit pass, not a rewrite — the candidate already wrote these bullets well; your job is to nudge terminology toward the posting's language, not restructure their writing.

Rules:
- Default to leaving a bullet's wording, sentence structure, and phrasing exactly as given. Only change something if the job posting uses different terminology for the same thing the bullet already describes (e.g. the bullet says "REST APIs" and the posting says "RESTful services" — align the term) or if reordering which clause comes first would surface a keyword the posting cares about, without changing what the sentence says.
- Do not add any fact, number, tool, or outcome that isn't already in that exact bullet's text. Do not remove a fact, number, or tool that is already in the bullet's text.
- Do not shorten, expand, merge unrelated ideas, or generally "punch up" a bullet. If nothing in a bullet needs to change to match this job, return it unchanged.
- sourceBulletIds: the id(s) of the bullet(s) your edited text is based on. Usually one id per output bullet; you may combine two given bullets into one output bullet only if they describe the same underlying accomplishment. Never invent a source id — every id you use must come from the bullets given to you.
- Return exactly one output bullet per bullet given to you, unless you combined two into one.
- Also write: a professional summary (2-3 sentences) — keep it close to the candidate's existing summary, only adjusting the job-title/focus phrasing and a keyword or two to match this posting, consistent only with the candidate's given bullets; and a skills list of the 12-20 entries most relevant to this job, drawn only from the availableSkills list given to you and ordered most-relevant first — a curated subset like a real resume shows, not the entire list.
- Never invent a metric, percentage, dollar amount, or scale that isn't already stated in a source bullet.`;

export const humanizeResumeResultSchema = z.object({
  summary: z.string().min(1),
  bullets: z.array(z.string().min(1)),
});
export type HumanizeResumeResult = z.infer<typeof humanizeResumeResultSchema>;

export const HUMANIZE_RESUME_SYSTEM_PROMPT = `You do a light copy-edit pass on resume text the candidate already wrote in their own voice. This is proofreading, not rewriting — leave a bullet exactly as given unless it actually violates one of the rules below.

Style guide (only fix a bullet if it breaks one of these):
- Past tense for past roles, present tense for the current role.
- No emojis, no exclamation marks.
- Never use any of these words or phrases: {{bannedPhrases}}.

Rules:
- If a bullet already matches the style guide and doesn't use a banned phrase, return it completely unchanged. Do not paraphrase, rephrase, or "polish" wording that isn't actually broken.
- When a fix is needed, make the smallest edit that fixes it — don't restructure the rest of the sentence.
- Voice samples are given only to match tone on the rare bullet that genuinely needs rewording (e.g. to remove a banned phrase) — they are not a license to rewrite bullets that are already fine.
- Return exactly one output bullet per input bullet, in the same order — do not add, remove, or merge bullets. Do not add any number, percentage, or fact not already present in that exact bullet.`;

// PROJECT_SPEC.md §4.5 — cover letter draft, before the humanize pass.
export const coverLetterResultSchema = z.object({
  greeting: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(3).max(4),
  signOff: z.string().min(1),
  referencedBulletIds: z.array(z.string()).max(2),
});
export type CoverLetterResult = z.infer<typeof coverLetterResultSchema>;

export const GENERATE_COVER_LETTER_SYSTEM_PROMPT = `You write a cover letter for this candidate applying to this job.

Rules:
- 250-350 words total, across 3-4 short paragraphs.
- Reference at least one specific detail from the job description given to you (a responsibility, requirement, or something the posting mentions).
- Reference at most 2 accomplishments from the candidate, and ONLY facts already present in the bullets given to you — never invent a number, tool, or outcome.
- referencedBulletIds: the id(s) of up to 2 bullets your accomplishment references are drawn from. Never invent an id, and leave empty if you reference no specific accomplishment.
- Never state a specific total number of years of experience, or any other candidate fact, that isn't drawn from a given bullet — this system can only verify numbers that trace back to a specific bullet.
- greeting: "Dear Hiring Manager," unless a specific hiring manager name was given to you.
- If a "why this company" note from the candidate is given, weave it in close to as-written, only lightly edited for flow.
- signOff: e.g. "Sincerely, {candidate's name}."`;

export const humanizeCoverLetterResultSchema = z.object({
  paragraphs: z.array(z.string().min(1)),
});
export type HumanizeCoverLetterResult = z.infer<typeof humanizeCoverLetterResultSchema>;

export const HUMANIZE_COVER_LETTER_SYSTEM_PROMPT = `You rewrite a cover letter's paragraphs so they read naturally, like the candidate wrote them in their own voice — without changing any fact, number, or claim they make.

Style guide:
- Plain, specific, confident language. No emojis, no exclamation marks.
- Never use any of these words or phrases: {{bannedPhrases}}.

You are given the candidate's own voice samples (real past writing, to match their tone) plus the letter's paragraphs in order. Return a humanized version of each paragraph, in the same order, exactly one output paragraph per input paragraph.`;

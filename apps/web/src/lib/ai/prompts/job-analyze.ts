import { z } from "zod";

export const PROMPT_VERSION = "job-analyze@1";

// PROJECT_SPEC.md §4.3 step 1 — extract requirements.
export const requirementsSchema = z.object({
  mustHave: z.array(z.string()).default([]),
  niceToHave: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  seniority: z.string().default(""),
  minYears: z.number().optional(),
  location: z.string().optional(),
  remote: z.enum(["onsite", "remote", "hybrid"]).optional(),
  sponsorshipMentioned: z.boolean().default(false),
  salaryRange: z.string().optional(),
  redFlags: z.array(z.string()).default([]),
});
export type Requirements = z.infer<typeof requirementsSchema>;

export const EXTRACT_REQUIREMENTS_SYSTEM_PROMPT = `You read a job posting and extract its requirements into structured fields.

Rules:
- mustHave: requirements stated as required/must-have (e.g. "5+ years of X," "must have Y").
- niceToHave: requirements stated as preferred/bonus/nice-to-have.
- responsibilities: what the role actually does day to day, separate from qualifications.
- keywords: the specific skills, tools, languages, and frameworks named in the posting (short terms, not full sentences).
- seniority: the level implied by the title/text (e.g. "senior," "staff," "junior"), or "" if unclear.
- minYears: the minimum years of experience explicitly stated, omit if not stated.
- location / remote: as stated in the posting.
- sponsorshipMentioned: true only if the posting explicitly discusses visa sponsorship (offered, not offered, or required to already have work authorization).
- salaryRange: as stated (e.g. "$120k-$150k"), omit if not stated.
- redFlags: signs of a problematic listing — e.g. "requires an active security clearance," "commission-only," vague/unverifiable company info, or other signs of a scam. Omit entirely if none.
Use only what's in the text. Do not invent requirements, numbers, or a salary/location that isn't stated.`;

// PROJECT_SPEC.md §4.3 step 2 — evidence mapping. `evidenceBulletIds` must
// only ever contain ids from the bullet list given in the prompt input;
// code (not this schema) verifies that and downgrades on any hallucination.
export const evidenceItemSchema = z.object({
  requirement: z.string(),
  type: z.enum(["must", "nice"]),
  status: z.enum(["met", "partial", "missing"]),
  evidenceBulletIds: z.array(z.string()).default([]),
  reason: z.string(),
});
export const evidenceResultSchema = z.object({ items: z.array(evidenceItemSchema) });
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const FIND_EVIDENCE_SYSTEM_PROMPT = `You are given a list of job requirements and a candidate's resume bullets, each bullet tagged with an id.

For every requirement in the input list, return exactly one result item with:
- requirement: the requirement text, copied exactly as given.
- type: "must" or "nice", copied from the input.
- status: "met" if the candidate's bullets clearly demonstrate it, "partial" if related but not a clear match, "missing" if nothing supports it.
- evidenceBulletIds: the ids of the specific bullets that support your status. Use ONLY ids from the list you were given — never invent an id, and leave this empty for "missing".
- reason: one short sentence explaining your judgment, referencing what the evidence actually says.

Do not credit a requirement based on anything not literally present in the given bullets.`;

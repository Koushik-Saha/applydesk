import { z } from "zod";

// A single tailored bullet in the assembled document. `sourceBulletIds`
// traces back to packages/shared/schemas/master-profile's Bullet.id —
// CLAUDE.md rule 2, "tailored bullets must carry sourceBulletIds."
export const tailoredBulletSchema = z.object({
  sourceBulletIds: z.array(z.string()).min(1),
  text: z.string().min(1),
  // set by lib/generation/rewrite.ts when the no-new-facts validator still
  // failed after one retry — the bullet fell back to its original text.
  originalKept: z.boolean().default(false),
  // per-bullet style lint messages (banned phrase, too long, em dash, "!"),
  // carried directly on the bullet so the editor never has to re-match a
  // flat lint-warning index back to a specific row.
  lintWarnings: z.array(z.string()).default([]),
});
export type TailoredBullet = z.infer<typeof tailoredBulletSchema>;

// Experience/project block as it appears in the tailored resume. Company,
// title and dates are copied verbatim from the profile by code (CLAUDE.md
// rule 2) — never written by the model.
export const resumeExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean(),
  bullets: z.array(tailoredBulletSchema),
  // older, less relevant roles are shown as a single line (title/company/
  // dates only, no bullets) per PROJECT_SPEC.md §4.4 step 1.
  summarized: z.boolean().default(false),
});
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;

export const resumeEducationSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ResumeEducation = z.infer<typeof resumeEducationSchema>;

export const resumeContentSchema = z.object({
  contactFullName: z.string(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  contactLocation: z.string().optional(),
  contactLinkedin: z.string().optional(),
  contactGithub: z.string().optional(),
  contactPortfolio: z.string().optional(),
  summary: z.string(),
  experiences: z.array(resumeExperienceSchema),
  education: z.array(resumeEducationSchema),
  skills: z.array(z.string()),
  // §4.4 step 5 — keyword coverage before (from the job_analysis) vs after
  // (recomputed against this tailored document).
  keywordCoverage: z.object({
    before: z.number().int().min(0).max(100),
    after: z.number().int().min(0).max(100),
    foundAfter: z.array(z.string()),
    missingAfter: z.array(z.string()),
  }),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;

export const coverLetterContentSchema = z.object({
  greeting: z.string(),
  paragraphs: z.array(z.string()).min(1),
  signOff: z.string(),
  referencedBulletIds: z.array(z.string()),
  originalKept: z.boolean().default(false),
});
export type CoverLetterContent = z.infer<typeof coverLetterContentSchema>;

export const violationSchema = z.object({
  code: z.string(),
  message: z.string(),
  bulletIndex: z.number().int().optional(),
});
export type Violation = z.infer<typeof violationSchema>;

export const lintIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  bulletIndex: z.number().int().optional(),
});
export type LintIssue = z.infer<typeof lintIssueSchema>;

export const documentValidationSchema = z.object({
  violations: z.array(violationSchema),
  fallbackBulletIndexes: z.array(z.number().int()),
});
export type DocumentValidation = z.infer<typeof documentValidationSchema>;

export const documentLintSchema = z.object({
  warnings: z.array(lintIssueSchema),
});
export type DocumentLint = z.infer<typeof documentLintSchema>;

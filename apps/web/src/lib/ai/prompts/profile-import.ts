import { z } from "zod";
import { createId, extractMetrics, type MasterProfile } from "@applydesk/shared";

// PROJECT_SPEC.md §6.2 — every prompt records the version that produced its
// output. Bump this whenever PROFILE_IMPORT_SYSTEM_PROMPT or the draft
// schema's shape changes.
export const PROMPT_VERSION = "profile-import@1";

// CLAUDE.md rule 2 / PROJECT_SPEC.md §4.1 — the model never produces ids or
// metrics; both are added in code (see draftToMasterProfile below), so
// neither field exists on this schema at all.
const draftBulletSchema = z.object({
  text: z.string().min(1),
  skills: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const draftContactSchema = z.object({
  fullName: z.string().default(""),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
});

const draftExperienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(draftBulletSchema).default([]),
});

const draftProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(draftBulletSchema).default([]),
});

const draftEducationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
});

const draftCertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
});

const draftPublicationSchema = z.object({
  title: z.string().min(1),
  publisher: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

const draftSkillSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
});

export const profileImportDraftSchema = z.object({
  contact: draftContactSchema,
  summary: z.string().default(""),
  experiences: z.array(draftExperienceSchema).default([]),
  projects: z.array(draftProjectSchema).default([]),
  education: z.array(draftEducationSchema).default([]),
  certifications: z.array(draftCertificationSchema).default([]),
  publications: z.array(draftPublicationSchema).default([]),
  skills: z.array(draftSkillSchema).default([]),
});

export type ProfileImportDraft = z.infer<typeof profileImportDraftSchema>;

export const PROFILE_IMPORT_SYSTEM_PROMPT = `You parse a resume's raw extracted text into structured fields.

Rules:
- Use only information present in the text. Never invent employers, titles, dates, degrees, numbers, or accomplishments.
- If a field isn't present in the text, omit it (or use an empty string for a required text field you can't fill).
- Keep each bullet to a single accomplishment; split a run-on sentence into separate bullets when the source clearly lists more than one thing.
- A bullet's "skills" are only the skills or tools explicitly mentioned in that bullet's own text.
- Dates: use the format written in the source when unambiguous (e.g. "2021-03" or "March 2021"). Do not compute, normalize, or guess a missing date.
- Do not include an "id" or "metrics" field anywhere in your output — those are added separately, after parsing.`;

type DraftBullet = z.infer<typeof draftBulletSchema>;

function toBullet(draft: DraftBullet) {
  return { id: createId(), text: draft.text, skills: draft.skills, tags: draft.tags, metrics: extractMetrics(draft.text) };
}

// Attaches stable ids (createId()) and auto-detected metrics
// (extractMetrics()) in code — never trusting the model for either.
export function draftToMasterProfile(draft: ProfileImportDraft): MasterProfile {
  return {
    contact: draft.contact,
    summary: draft.summary,
    experiences: draft.experiences.map((e) => ({ ...e, id: createId(), bullets: e.bullets.map(toBullet) })),
    projects: draft.projects.map((p) => ({ ...p, id: createId(), bullets: p.bullets.map(toBullet) })),
    education: draft.education.map((e) => ({ ...e, id: createId() })),
    certifications: draft.certifications.map((c) => ({ ...c, id: createId() })),
    publications: draft.publications.map((p) => ({ ...p, id: createId() })),
    skills: draft.skills.map((s) => ({ ...s, id: createId() })),
  };
}

import { z } from "zod";

// PROJECT_SPEC.md §4.1 — every entity below carries a stable `id`, generated
// in code (see lib/id.ts), never by the model.
const id = z.string().min(1);

export const bulletSchema = z.object({
  id,
  text: z.string().min(1),
  skills: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const contactSchema = z.object({
  fullName: z.string().default(""),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
});

export const experienceSchema = z.object({
  id,
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  bullets: z.array(bulletSchema).default([]),
});

export const projectSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(bulletSchema).default([]),
});

export const educationSchema = z.object({
  id,
  school: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
});

export const certificationSchema = z.object({
  id,
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
});

export const publicationSchema = z.object({
  id,
  title: z.string().min(1),
  publisher: z.string().optional(),
  date: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export const skillSchema = z.object({
  id,
  name: z.string().min(1),
  category: z.string().optional(),
});

export const masterProfileSchema = z.object({
  contact: contactSchema,
  summary: z.string().default(""),
  experiences: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  education: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  publications: z.array(publicationSchema).default([]),
  skills: z.array(skillSchema).default([]),
});

export type Bullet = z.infer<typeof bulletSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type MasterProfile = z.infer<typeof masterProfileSchema>;

export function emptyMasterProfile(): MasterProfile {
  return masterProfileSchema.parse({ contact: {} });
}

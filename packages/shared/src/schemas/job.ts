import { z } from "zod";

// PROJECT_SPEC.md §4.2 — kept in sync with lib/db/schema/jobs.ts's TS union
// types by hand (the DB column is plain `text`, not a Postgres enum, so
// there's no single source of truth to derive from).
export const jobStatusSchema = z.enum([
  "new",
  "analyzing",
  "scored",
  "generating",
  "draft",
  "approved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "skipped",
  "withdrawn",
  "error",
]);
export type JobStatusValue = z.infer<typeof jobStatusSchema>;

export const atsTypeSchema = z.enum([
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "linkedin",
  "indeed",
  "other",
]);

export const remoteTypeSchema = z.enum(["onsite", "remote", "hybrid"]);

// POST /api/jobs (manual add) — §4.2 "paste URL + description," plus the
// title/company the extension would otherwise have scraped.
export const manualJobInputSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  url: z.string().min(1),
  description: z.string().min(1),
  location: z.string().optional(),
  remoteType: remoteTypeSchema.optional(),
});
export type ManualJobInput = z.infer<typeof manualJobInputSchema>;

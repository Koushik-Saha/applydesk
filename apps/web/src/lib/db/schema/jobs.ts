import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestamps } from "./columns";
import { user } from "./auth";
import { profileVersions } from "./profile";

// PROJECT_SPEC.md §4.2. Kept as `text` (not a Postgres enum) so new statuses
// don't require an ALTER TYPE migration — validated at the API boundary
// (packages/shared zod schemas) instead.
export type JobSource = "extension" | "manual";
export type AtsType =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "linkedin"
  | "indeed"
  | "other";
export type RemoteType = "onsite" | "remote" | "hybrid";
export type JobStatus =
  | "new"
  | "analyzing"
  | "scored"
  | "generating"
  | "draft"
  | "approved"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "skipped"
  | "withdrawn"
  | "error";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").$type<JobSource>().notNull(),
    url: text("url"),
    urlHash: text("url_hash").notNull(),
    atsType: text("ats_type").$type<AtsType>(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    remoteType: text("remote_type").$type<RemoteType>(),
    rawDescription: text("raw_description").notNull(),
    descriptionHash: text("description_hash").notNull(),
    status: text("status").$type<JobStatus>().notNull().default("new"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    notes: text("notes"),
    archived: boolean("archived").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    unique("jobs_owner_url_hash_unique").on(table.ownerId, table.urlHash),
    index("jobs_status_idx").on(table.status),
  ],
);

export const jobAnalyses = pgTable(
  "job_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    requirements: jsonb("requirements").notNull(),
    evidence: jsonb("evidence").notNull(),
    score: integer("score").notNull(),
    band: text("band").notNull(),
    breakdown: jsonb("breakdown").notNull(),
    flags: jsonb("flags").notNull(),
    profileVersionId: uuid("profile_version_id")
      .notNull()
      .references(() => profileVersions.id),
    promptVersion: text("prompt_version").notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [index("job_analyses_job_id_idx").on(table.jobId)],
);

export const jobFolders = pgTable("job_folders", {
  jobId: uuid("job_id")
    .primaryKey()
    .references(() => jobs.id, { onDelete: "cascade" }),
  driveFolderId: text("drive_folder_id").notNull(),
  driveFolderLink: text("drive_folder_link").notNull(),
  createdAt: timestamps.createdAt,
});

export const jobEvents = pgTable(
  "job_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    meta: jsonb("meta"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("job_events_job_id_idx").on(table.jobId)],
);

export const jobsRelations = relations(jobs, ({ many, one }) => ({
  analyses: many(jobAnalyses),
  events: many(jobEvents),
  folder: one(jobFolders, {
    fields: [jobs.id],
    references: [jobFolders.jobId],
  }),
}));

export const jobAnalysesRelations = relations(jobAnalyses, ({ one }) => ({
  job: one(jobs, { fields: [jobAnalyses.jobId], references: [jobs.id] }),
}));

export const jobFoldersRelations = relations(jobFolders, ({ one }) => ({
  job: one(jobs, { fields: [jobFolders.jobId], references: [jobs.id] }),
}));

export const jobEventsRelations = relations(jobEvents, ({ one }) => ({
  job: one(jobs, { fields: [jobEvents.jobId], references: [jobs.id] }),
}));

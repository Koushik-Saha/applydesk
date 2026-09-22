import { pgTable, uuid, text, integer, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestamps } from "./columns";
import { jobs } from "./jobs";
import { profileVersions } from "./profile";

export type DocumentKind = "resume" | "cover_letter";
export type DocumentStatus = "draft" | "approved";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    kind: text("kind").$type<DocumentKind>().notNull(),
    version: integer("version").notNull(),
    content: jsonb("content").notNull(),
    lint: jsonb("lint"),
    validation: jsonb("validation"),
    postScore: integer("post_score"),
    status: text("status").$type<DocumentStatus>().notNull().default("draft"),
    profileVersionId: uuid("profile_version_id")
      .notNull()
      .references(() => profileVersions.id),
    promptVersion: text("prompt_version").notNull(),
    driveFileId: text("drive_file_id"),
    driveWebViewLink: text("drive_web_view_link"),
    fileName: text("file_name"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [unique("documents_job_kind_version_unique").on(table.jobId, table.kind, table.version)],
);

export const documentsRelations = relations(documents, ({ one }) => ({
  job: one(jobs, { fields: [documents.jobId], references: [jobs.id] }),
}));

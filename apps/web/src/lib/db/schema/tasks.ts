import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestamps } from "./columns";
import { jobs } from "./jobs";

// PROJECT_SPEC.md §6.1. `type` stays a free-form string — new task types
// (profile_import, job_analyze, job_generate, ...) land across milestones
// without a schema migration; validated where enqueued.
export type TaskStatus = "queued" | "running" | "done" | "failed";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    status: text("status").$type<TaskStatus>().notNull().default("queued"),
    // DESIGN.md §7 — "AI in progress: step list ... each step checks off
    // live." Not in PROJECT_SPEC.md's table listing; added so TaskProgress
    // has real per-step granularity instead of one coarse status.
    currentStep: text("current_step"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    // Not in PROJECT_SPEC.md's table listing either — profile_import (and
    // future AI tasks) need to hand back a result for the caller to show
    // (e.g. a review screen), not just a pass/fail status.
    result: jsonb("result"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("tasks_status_idx").on(table.status), index("tasks_job_id_idx").on(table.jobId)],
);

export const tasksRelations = relations(tasks, ({ one }) => ({
  job: one(jobs, { fields: [tasks.jobId], references: [jobs.id] }),
}));

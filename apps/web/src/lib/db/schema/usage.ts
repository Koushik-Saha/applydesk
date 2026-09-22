import { pgTable, uuid, text, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { jobs } from "./jobs";

// PROJECT_SPEC.md §6.2 — one row per generateStructured() call, for the
// Settings → Usage view and per-job cost tracking.
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    step: text("step").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_usage_job_id_idx").on(table.jobId)],
);

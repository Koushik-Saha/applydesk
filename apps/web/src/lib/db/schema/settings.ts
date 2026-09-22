import { pgTable, text, jsonb } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { user } from "./auth";

// PROJECT_SPEC.md §4.10 — score thresholds, banned phrase list, AI models per step.
export const settings = pgTable("settings", {
  ownerId: text("owner_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  ...timestamps,
});

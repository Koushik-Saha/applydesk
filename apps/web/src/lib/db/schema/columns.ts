import { timestamp } from "drizzle-orm/pg-core";

// PROJECT_SPEC.md §8 — "UUID ids, timestamptz UTC, createdAt/updatedAt everywhere."
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

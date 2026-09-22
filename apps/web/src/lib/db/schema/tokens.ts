import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { user } from "./auth";

// PROJECT_SPEC.md §10 — random 32 bytes, shown once; only the SHA-256 hash
// and a display prefix are stored.
export const apiTokens = pgTable(
  "api_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("api_tokens_owner_id_idx").on(table.ownerId)],
);

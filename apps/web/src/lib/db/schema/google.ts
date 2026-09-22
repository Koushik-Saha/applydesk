import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// PROJECT_SPEC.md §8, §10 — refreshTokenEnc is AES-256-GCM ciphertext
// (ENCRYPTION_KEY), never the raw Google refresh token.
export const googleConnections = pgTable("google_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  googleEmail: text("google_email").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  rootFolderId: text("root_folder_id"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
});

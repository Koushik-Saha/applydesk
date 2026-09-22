import { pgTable, uuid, text, integer, jsonb, unique, index, AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { timestamps } from "./columns";
import { user } from "./auth";

// PROJECT_SPEC.md §8. profiles <-> profile_versions is circular
// (profiles.activeVersionId -> profile_versions.id, profile_versions.profileId
// -> profiles.id); the deferred `(): AnyPgColumn =>` callbacks let drizzle-kit
// create both tables before adding either foreign key.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  // one master profile per owner
  ownerId: text("owner_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  activeVersionId: uuid("active_version_id").references((): AnyPgColumn => profileVersions.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const profileVersions = pgTable(
  "profile_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references((): AnyPgColumn => profiles.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    // MasterProfile schema (packages/shared)
    data: jsonb("data").notNull(),
    note: text("note"),
    createdAt: timestamps.createdAt,
  },
  (table) => [unique("profile_versions_profile_version_unique").on(table.profileId, table.version)],
);

export const voiceSamples = pgTable(
  "voice_samples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    text: text("text").notNull(),
    ...timestamps,
  },
  (table) => [index("voice_samples_owner_id_idx").on(table.ownerId)],
);

export const standardAnswers = pgTable("standard_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  // StandardAnswers schema (packages/shared)
  data: jsonb("data").notNull(),
  ...timestamps,
});

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  versions: many(profileVersions),
  activeVersion: one(profileVersions, {
    fields: [profiles.activeVersionId],
    references: [profileVersions.id],
  }),
}));

export const profileVersionsRelations = relations(profileVersions, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileVersions.profileId],
    references: [profiles.id],
  }),
}));

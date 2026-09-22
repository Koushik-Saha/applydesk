import { and, desc, eq, max } from "drizzle-orm";
import { masterProfileSchema, type MasterProfile } from "@applydesk/shared";
import { db } from "@/lib/db/client";
import { profiles, profileVersions } from "@/lib/db/schema";

export interface ProfileVersionSummary {
  id: string;
  version: number;
  note: string | null;
  createdAt: Date;
}

export interface ActiveProfile {
  profile: MasterProfile;
  versionId: string;
  version: number;
}

// PROJECT_SPEC.md §4.1 — "Profile has version history"; saving never
// mutates a prior version, it only ever appends the next one and repoints
// the profile's activeVersionId.
export async function getActiveProfile(ownerId: string): Promise<ActiveProfile | null> {
  const [row] = await db
    .select({
      versionId: profileVersions.id,
      version: profileVersions.version,
      data: profileVersions.data,
    })
    .from(profiles)
    .innerJoin(profileVersions, eq(profiles.activeVersionId, profileVersions.id))
    .where(eq(profiles.ownerId, ownerId))
    .limit(1);

  if (!row) return null;

  return {
    profile: masterProfileSchema.parse(row.data),
    versionId: row.versionId,
    version: row.version,
  };
}

export async function saveProfileVersion(
  ownerId: string,
  data: MasterProfile,
  note?: string,
): Promise<ActiveProfile> {
  const validated = masterProfileSchema.parse(data);

  return db.transaction(async (tx) => {
    let [profile] = await tx.select().from(profiles).where(eq(profiles.ownerId, ownerId)).limit(1);

    if (!profile) {
      [profile] = await tx.insert(profiles).values({ ownerId }).returning();
    }

    const maxVersionRows = await tx
      .select({ maxVersion: max(profileVersions.version) })
      .from(profileVersions)
      .where(eq(profileVersions.profileId, profile!.id));

    const nextVersion = (maxVersionRows[0]?.maxVersion ?? 0) + 1;

    const [version] = await tx
      .insert(profileVersions)
      .values({ profileId: profile!.id, version: nextVersion, data: validated, note })
      .returning();

    await tx.update(profiles).set({ activeVersionId: version!.id }).where(eq(profiles.id, profile!.id));

    return { profile: validated, versionId: version!.id, version: version!.version };
  });
}

export async function listProfileVersions(ownerId: string): Promise<ProfileVersionSummary[]> {
  const rows = await db
    .select({
      id: profileVersions.id,
      version: profileVersions.version,
      note: profileVersions.note,
      createdAt: profileVersions.createdAt,
    })
    .from(profileVersions)
    .innerJoin(profiles, eq(profiles.id, profileVersions.profileId))
    .where(eq(profiles.ownerId, ownerId))
    .orderBy(desc(profileVersions.version));

  return rows;
}

// Used by job_analyses' evidence display — evidenceBulletIds refer to
// whatever version was active WHEN THAT ANALYSIS RAN, which may not be the
// current active profile if it's since been edited.
export async function getProfileVersionById(versionId: string): Promise<MasterProfile | null> {
  const [row] = await db
    .select({ data: profileVersions.data })
    .from(profileVersions)
    .where(eq(profileVersions.id, versionId))
    .limit(1);

  return row ? masterProfileSchema.parse(row.data) : null;
}

export class VersionNotFoundError extends Error {}

// "Restore" repoints activeVersionId at an existing, immutable version row —
// it does not duplicate data or create a new version. Editing after a
// restore creates the next version in the sequence, as normal.
export async function restoreProfileVersion(ownerId: string, versionId: string): Promise<ActiveProfile> {
  const [row] = await db
    .select({
      profileId: profileVersions.profileId,
      version: profileVersions.version,
      data: profileVersions.data,
    })
    .from(profileVersions)
    .innerJoin(profiles, eq(profiles.id, profileVersions.profileId))
    .where(and(eq(profileVersions.id, versionId), eq(profiles.ownerId, ownerId)))
    .limit(1);

  if (!row) throw new VersionNotFoundError(`No such profile version: ${versionId}`);

  await db.update(profiles).set({ activeVersionId: versionId }).where(eq(profiles.id, row.profileId));

  return {
    profile: masterProfileSchema.parse(row.data),
    versionId,
    version: row.version,
  };
}

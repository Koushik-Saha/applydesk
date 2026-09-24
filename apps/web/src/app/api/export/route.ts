import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { withOwner } from "@/lib/http/with-owner";
import { db } from "@/lib/db/client";
import {
  jobs,
  jobAnalyses,
  documents,
  jobEvents,
  jobFolders,
  profiles,
  profileVersions,
  standardAnswers,
  voiceSamples,
  settings,
  googleConnections,
} from "@/lib/db/schema";

// PROJECT_SPEC.md §9, §4.10 — GET /api/export "Data export (JSON of everything)"
export async function GET() {
  return withOwner(async (ownerId) => {
    const [
      userProfiles,
      userVoiceSamples,
      userStandardAnswers,
      userSettings,
      userGoogle,
      userJobs,
    ] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.ownerId, ownerId)),
      db.select().from(voiceSamples).where(eq(voiceSamples.ownerId, ownerId)),
      db.select().from(standardAnswers).where(eq(standardAnswers.ownerId, ownerId)),
      db.select().from(settings).where(eq(settings.ownerId, ownerId)),
      db
        .select({
          id: googleConnections.id,
          googleEmail: googleConnections.googleEmail,
          rootFolderId: googleConnections.rootFolderId,
          connectedAt: googleConnections.connectedAt,
        })
        .from(googleConnections)
        .where(eq(googleConnections.ownerId, ownerId)),
      db.select().from(jobs).where(eq(jobs.ownerId, ownerId)),
    ]);

    const profileIds = userProfiles.map((p) => p.id);
    const userProfileVersions =
      profileIds.length > 0
        ? await db
            .select()
            .from(profileVersions)
            .where(inArray(profileVersions.profileId, profileIds))
        : [];

    const jobIds = userJobs.map((j) => j.id);
    const [userAnalyses, userDocuments, userEvents, userFolders] =
      jobIds.length > 0
        ? await Promise.all([
            db.select().from(jobAnalyses).where(inArray(jobAnalyses.jobId, jobIds)),
            db.select().from(documents).where(inArray(documents.jobId, jobIds)),
            db.select().from(jobEvents).where(inArray(jobEvents.jobId, jobIds)),
            db.select().from(jobFolders).where(inArray(jobFolders.jobId, jobIds)),
          ])
        : [[], [], [], []];

    const exportData = {
      exportedAt: new Date().toISOString(),
      ownerId,
      version: "1.0",
      profile: {
        profiles: userProfiles,
        versions: userProfileVersions,
        voiceSamples: userVoiceSamples,
        standardAnswers: userStandardAnswers,
      },
      jobs: userJobs.map((job) => ({
        ...job,
        analyses: userAnalyses.filter((a) => a.jobId === job.id),
        documents: userDocuments.filter((d) => d.jobId === job.id),
        events: userEvents.filter((e) => e.jobId === job.id),
        folder: userFolders.find((f) => f.jobId === job.id) ?? null,
      })),
      settings: userSettings[0]?.data ?? null,
      google: userGoogle[0] ?? null,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="applydesk-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  });
}

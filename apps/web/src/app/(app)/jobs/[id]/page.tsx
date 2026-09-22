import { notFound, redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { getJob, getLatestAnalysis } from "@/lib/jobs/service";
import { getLatestTaskForJob } from "@/lib/tasks/get-task";
import { getProfileVersionById } from "@/lib/profile/service";
import { requirementsSchema, evidenceItemSchema } from "@/lib/ai/prompts/job-analyze";
import { JobDetail } from "./job-detail";
import { z } from "zod";

const evidenceListSchema = z.array(evidenceItemSchema);
const flagsSchema = z.object({
  yearsGap: z.boolean(),
  clearance: z.boolean(),
  sponsorship: z.boolean(),
  locationMismatch: z.boolean(),
  redFlags: z.array(z.string()),
});
const breakdownSchema = z.object({
  keywordsFound: z.array(z.string()).default([]),
  keywordsMissing: z.array(z.string()).default([]),
});

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  let ownerId: string;
  try {
    const session = await requireOwner();
    ownerId = session.user.id;
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }

  const { id } = await params;
  const job = await getJob(ownerId, id);
  if (!job) notFound();

  const [analysis, analyzeTask] = await Promise.all([
    getLatestAnalysis(job.id),
    getLatestTaskForJob(job.id, "job_analyze"),
  ]);

  // evidenceBulletIds refer to whichever profile version was active WHEN
  // that analysis ran, not necessarily today's active profile.
  let bulletTextById: Record<string, string> = {};
  if (analysis) {
    const profile = await getProfileVersionById(analysis.profileVersionId);
    if (profile) {
      const bullets = [
        ...profile.experiences.flatMap((e) => e.bullets),
        ...profile.projects.flatMap((p) => p.bullets),
      ];
      bulletTextById = Object.fromEntries(bullets.map((b) => [b.id, b.text]));
    }
  }

  return (
    <JobDetail
      // remounts JobDetail with fresh props whenever the underlying data
      // actually changes (e.g. after router.refresh() once analysis
      // completes) instead of leaving stale client state in place.
      key={`${job.status}-${analysis?.id ?? "none"}`}
      job={{
        id: job.id,
        title: job.title,
        company: job.company,
        url: job.url,
        location: job.location,
        remoteType: job.remoteType,
        rawDescription: job.rawDescription,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
      }}
      analysis={
        analysis && {
          requirements: requirementsSchema.parse(analysis.requirements),
          evidence: evidenceListSchema.parse(analysis.evidence),
          score: analysis.score,
          band: analysis.band,
          flags: flagsSchema.parse(analysis.flags),
          keywords: breakdownSchema.parse(analysis.breakdown),
          createdAt: analysis.createdAt.toISOString(),
        }
      }
      analyzeTask={analyzeTask}
      bulletTextById={bulletTextById}
    />
  );
}

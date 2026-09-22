import { notFound, redirect } from "next/navigation";
import {
  coverLetterContentSchema,
  documentLintSchema,
  documentValidationSchema,
  resumeContentSchema,
} from "@applydesk/shared";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { getJob, getLatestAnalysis } from "@/lib/jobs/service";
import { getLatestTaskForJob } from "@/lib/tasks/get-task";
import { getProfileVersionById } from "@/lib/profile/service";
import { listDocuments } from "@/lib/documents/service";
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

  const [analysis, analyzeTask, generateTask, documentRows] = await Promise.all([
    getLatestAnalysis(job.id),
    getLatestTaskForJob(job.id, "job_analyze"),
    getLatestTaskForJob(job.id, "job_generate"),
    listDocuments(job.id),
  ]);

  // evidenceBulletIds / sourceBulletIds refer to whichever profile version
  // was active WHEN that analysis/generation ran, not necessarily today's.
  const profileVersionIds = new Set<string>();
  if (analysis) profileVersionIds.add(analysis.profileVersionId);
  for (const doc of documentRows) profileVersionIds.add(doc.profileVersionId);

  const bulletTextById: Record<string, string> = {};
  for (const versionId of profileVersionIds) {
    const profile = await getProfileVersionById(versionId);
    if (!profile) continue;
    const bullets = [
      ...profile.experiences.flatMap((e) => e.bullets),
      ...profile.projects.flatMap((p) => p.bullets),
    ];
    for (const b of bullets) bulletTextById[b.id] = b.text;
  }

  const resumeVersions = documentRows
    .filter((d) => d.kind === "resume")
    .map((d) => ({
      id: d.id,
      version: d.version,
      content: resumeContentSchema.parse(d.content),
      lint: documentLintSchema.parse(d.lint ?? { warnings: [] }),
      validation: documentValidationSchema.parse(d.validation ?? { violations: [], fallbackBulletIndexes: [] }),
      createdAt: d.createdAt.toISOString(),
    }));

  const coverLetterVersions = documentRows
    .filter((d) => d.kind === "cover_letter")
    .map((d) => ({
      id: d.id,
      version: d.version,
      content: coverLetterContentSchema.parse(d.content),
      lint: documentLintSchema.parse(d.lint ?? { warnings: [] }),
      validation: documentValidationSchema.parse(d.validation ?? { violations: [], fallbackBulletIndexes: [] }),
      createdAt: d.createdAt.toISOString(),
    }));

  return (
    <JobDetail
      // remounts JobDetail with fresh props whenever the underlying data
      // actually changes (e.g. after router.refresh() once analysis
      // completes) instead of leaving stale client state in place.
      key={`${job.status}-${analysis?.id ?? "none"}-${resumeVersions.length}-${coverLetterVersions.length}`}
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
      generateTask={generateTask}
      resumeVersions={resumeVersions}
      coverLetterVersions={coverLetterVersions}
      bulletTextById={bulletTextById}
    />
  );
}

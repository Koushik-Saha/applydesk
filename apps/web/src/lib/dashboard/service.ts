import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, tasks, type JobStatus } from "@/lib/db/schema";

export interface DashboardStats {
  savedThisWeek: number;
  appliedThisWeek: number;
  avgScoreApplied: number | null;
  responseRate: number | null;
  totalJobs: number;
}

export interface NeedsAttentionItem {
  id: string;
  type: "draft" | "approved" | "failed_task" | "needs_scoring";
  title: string;
  subtitle: string;
  jobId: string;
  score?: number | null;
  band?: string | null;
  createdAt: string;
  errorMessage?: string;
  taskId?: string;
}

export async function getDashboardStats(ownerId: string): Promise<DashboardStats> {
  const allJobs = await db
    .select({
      id: jobs.id,
      status: jobs.status,
      score: jobs.score,
      createdAt: jobs.createdAt,
      statusChangedAt: jobs.statusChangedAt,
      appliedAt: jobs.appliedAt,
    })
    .from(jobs)
    .where(and(eq(jobs.ownerId, ownerId), eq(jobs.archived, false)));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const savedThisWeek = allJobs.filter((j) => new Date(j.createdAt) >= sevenDaysAgo).length;

  const appliedThisWeek = allJobs.filter((j) => {
    if (j.status !== "applied" && j.status !== "interviewing" && j.status !== "offer" && j.status !== "rejected") {
      return false;
    }
    const appliedDate = j.appliedAt ? new Date(j.appliedAt) : new Date(j.statusChangedAt);
    return appliedDate >= sevenDaysAgo;
  }).length;

  const appliedStatuses: JobStatus[] = ["applied", "interviewing", "offer", "rejected"];
  const appliedJobs = allJobs.filter((j) => appliedStatuses.includes(j.status));

  const scoredAppliedJobs = appliedJobs.filter((j) => typeof j.score === "number");
  const avgScoreApplied =
    scoredAppliedJobs.length > 0
      ? Math.round(
          scoredAppliedJobs.reduce((acc, curr) => acc + (curr.score ?? 0), 0) /
            scoredAppliedJobs.length,
        )
      : null;

  const interviewingOrOffer = appliedJobs.filter(
    (j) => j.status === "interviewing" || j.status === "offer",
  );
  const responseRate =
    appliedJobs.length > 0
      ? Math.round((interviewingOrOffer.length / appliedJobs.length) * 100)
      : null;

  return {
    savedThisWeek,
    appliedThisWeek,
    avgScoreApplied,
    responseRate,
    totalJobs: allJobs.length,
  };
}

export async function getNeedsAttention(ownerId: string): Promise<NeedsAttentionItem[]> {
  const [activeJobs, failedTaskRows] = await Promise.all([
    db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.ownerId, ownerId),
          eq(jobs.archived, false),
          inArray(jobs.status, ["new", "draft", "approved"]),
        ),
      )
      .orderBy(desc(jobs.createdAt)),
    db
      .select({
        task: tasks,
        jobCompany: jobs.company,
        jobTitle: jobs.title,
      })
      .from(tasks)
      .leftJoin(jobs, eq(tasks.jobId, jobs.id))
      .where(and(eq(tasks.status, "failed"), eq(jobs.ownerId, ownerId)))
      .orderBy(desc(tasks.finishedAt))
      .limit(10),
  ]);

  const items: NeedsAttentionItem[] = [];

  for (const row of failedTaskRows) {
    items.push({
      id: `task-${row.task.id}`,
      type: "failed_task",
      title: `${row.jobCompany ?? "Job"} — ${row.jobTitle ?? "Application"}`,
      subtitle: `Task "${row.task.type}" failed`,
      jobId: row.task.jobId ?? "",
      errorMessage: row.task.error ?? "Task failed.",
      taskId: row.task.id,
      createdAt: (row.task.finishedAt ?? row.task.createdAt).toISOString(),
    });
  }

  for (const job of activeJobs) {
    if (job.status === "draft") {
      items.push({
        id: `job-draft-${job.id}`,
        type: "draft",
        title: `${job.company} — ${job.title}`,
        subtitle: "Draft documents ready for review",
        jobId: job.id,
        score: job.score,
        band: job.band,
        createdAt: job.createdAt.toISOString(),
      });
    } else if (job.status === "approved") {
      items.push({
        id: `job-approved-${job.id}`,
        type: "approved",
        title: `${job.company} — ${job.title}`,
        subtitle: "Documents approved — ready to submit application",
        jobId: job.id,
        score: job.score,
        band: job.band,
        createdAt: job.createdAt.toISOString(),
      });
    } else if (job.status === "new") {
      items.push({
        id: `job-new-${job.id}`,
        type: "needs_scoring",
        title: `${job.company} — ${job.title}`,
        subtitle: "New job posting — needs fit analysis",
        jobId: job.id,
        createdAt: job.createdAt.toISOString(),
      });
    }
  }

  return items;
}

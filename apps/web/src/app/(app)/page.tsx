import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { recoverStaleTasks } from "@/lib/tasks/stale-recovery";
import { listJobs } from "@/lib/jobs/service";
import { getDashboardStats, getNeedsAttention } from "@/lib/dashboard/service";
import { DashboardView } from "./dashboard-view";
import type { PipelineJob } from "./pipeline-board";

// PROJECT_SPEC.md §4.9 & DESIGN.md "Dashboard"
export default async function DashboardPage() {
  let ownerId: string;
  try {
    const session = await requireOwner();
    ownerId = session.user.id;
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }

  // Recover stale tasks (> 10 min) on dashboard load
  await recoverStaleTasks();

  const [stats, needsAttention, rawJobs] = await Promise.all([
    getDashboardStats(ownerId),
    getNeedsAttention(ownerId),
    listJobs(ownerId, {}),
  ]);

  if (rawJobs.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        message="No jobs yet. Save one from the extension or add one manually to get started."
        action={
          <Link
            href="/jobs/new"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="size-4 mr-1.5" />
            Add job
          </Link>
        }
      />
    );
  }

  const jobs: PipelineJob[] = rawJobs.map((j) => ({
    id: j.id,
    company: j.company,
    title: j.title,
    score: j.score,
    band: j.band,
    status: j.status,
    createdAt: j.createdAt.toISOString(),
    appliedAt: j.appliedAt ? j.appliedAt.toISOString() : null,
  }));

  return <DashboardView stats={stats} needsAttention={needsAttention} jobs={jobs} />;
}

import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AddJobDialog } from "@/components/app-shell/add-job-dialog";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { recoverStaleTasks } from "@/lib/tasks/stale-recovery";

export default async function DashboardPage() {
  try {
    await requireOwner();
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }

  // PROJECT_SPEC.md §6.1 — stale (running > 10 min) tasks are recovered here.
  await recoverStaleTasks();

  return (
    <EmptyState
      icon={LayoutDashboard}
      message="No activity yet. Save a job from the extension or add one manually to get started."
      action={<AddJobDialog />}
    />
  );
}

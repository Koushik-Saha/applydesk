import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AddJobDialog } from "@/components/app-shell/add-job-dialog";

export default function DashboardPage() {
  return (
    <EmptyState
      icon={LayoutDashboard}
      message="No activity yet. Save a job from the extension or add one manually to get started."
      action={<AddJobDialog />}
    />
  );
}

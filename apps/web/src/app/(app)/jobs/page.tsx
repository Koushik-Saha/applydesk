import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AddJobDialog } from "@/components/app-shell/add-job-dialog";

export default function JobsPage() {
  return (
    <EmptyState
      icon={Briefcase}
      message="No jobs yet. Save one from the extension or add it manually."
      action={<AddJobDialog />}
    />
  );
}

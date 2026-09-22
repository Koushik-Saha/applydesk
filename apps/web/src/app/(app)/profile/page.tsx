import { User } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <EmptyState
      icon={User}
      message="Your master profile is empty. Import your resume to get started."
      action={
        <Button disabled title="Coming soon">
          Import resume
        </Button>
      }
    />
  );
}

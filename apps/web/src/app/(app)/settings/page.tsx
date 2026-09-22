import { Settings } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <EmptyState
      icon={Settings}
      message="Nothing configured yet. Connect Google Drive to start saving generated documents."
      action={
        <Button disabled title="Coming soon">
          Connect Google Drive
        </Button>
      }
    />
  );
}

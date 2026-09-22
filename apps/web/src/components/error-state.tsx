import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// DESIGN.md §7 — Error: what failed + Retry button + no stack traces in UI.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <AlertTriangle className="size-8 text-[var(--missing)]" strokeWidth={1.5} aria-hidden="true" />
      <p className="max-w-sm text-sm text-text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

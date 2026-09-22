import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
}

// DESIGN.md §7 — Empty: one sentence + one action.
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <Icon className="size-8 text-text-muted" strokeWidth={1.5} aria-hidden="true" />
      <p className="max-w-sm text-sm text-text-muted">{message}</p>
      {action}
    </div>
  );
}

import type { JobStatusValue } from "@applydesk/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABELS: Record<JobStatusValue, string> = {
  new: "New",
  analyzing: "Analyzing",
  scored: "Scored",
  generating: "Generating",
  draft: "Draft",
  approved: "Approved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  skipped: "Skipped",
  withdrawn: "Withdrawn",
  error: "Error",
};

// DESIGN.md — status shown with color sparingly; icons/labels carry the
// meaning, color is never the only signal.
const TONE: Partial<Record<JobStatusValue, string>> = {
  offer: "text-[var(--met)] border-[var(--met)]/40",
  interviewing: "text-[var(--partial)] border-[var(--partial)]/40",
  rejected: "text-[var(--missing)] border-[var(--missing)]/40",
  withdrawn: "text-[var(--missing)] border-[var(--missing)]/40",
  error: "text-[var(--missing)] border-[var(--missing)]/40",
};

export function StatusBadge({ status }: { status: JobStatusValue }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-xs", TONE[status])}>
      {LABELS[status] ?? status}
    </Badge>
  );
}

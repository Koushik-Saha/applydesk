import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// DESIGN.md "Job page" — "Keyword chips: found (neutral) / missing (rose
// outline)."
export function KeywordChip({ label, found }: { label: string; found: boolean }) {
  return (
    <Badge
      variant={found ? "secondary" : "outline"}
      className={cn(!found && "border-[var(--missing)] text-[var(--missing)]")}
    >
      {label}
    </Badge>
  );
}

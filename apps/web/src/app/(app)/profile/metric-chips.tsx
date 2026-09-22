import { Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// DESIGN.md "Profile" — "Bullet editor shows auto-detected metrics as chips."
export function MetricChips({ metrics }: { metrics: string[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {metrics.map((metric, i) => (
        <Badge key={`${metric}-${i}`} variant="outline" className="gap-1 font-mono text-[var(--met)]">
          <Hash className="size-3" />
          {metric}
        </Badge>
      ))}
    </div>
  );
}

import { Loader2 } from "lucide-react"
import { cn } from "cn"

// Small, deliberate loading indicator for in-place actions (button clicks,
// inline refreshes) — DESIGN.md's "skeletons, never spinners" rule is about
// whole-page loads, not a single button's own pending state, which needs its
// own visible feedback so a click doesn't look like it did nothing.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }

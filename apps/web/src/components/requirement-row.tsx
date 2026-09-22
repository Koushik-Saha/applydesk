"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface RequirementRowProps {
  requirement: string;
  status: "met" | "partial" | "missing";
  reason: string;
  evidenceQuotes: string[];
}

const ICON: Record<RequirementRowProps["status"], string> = { met: "✓", partial: "◐", missing: "✕" };
const COLOR: Record<RequirementRowProps["status"], string> = {
  met: "var(--met)",
  partial: "var(--partial)",
  missing: "var(--missing)",
};

// DESIGN.md "Job page" — "Requirements checklist ... icon (✓ / ◐ / ✕) +
// requirement + expandable evidence quote from my profile."
export function RequirementRow({ requirement, status, reason, evidenceQuotes }: RequirementRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border last:border-none">
      <CollapsibleTrigger className="flex w-full items-start gap-2 py-2 text-left text-sm">
        <span className="mt-0.5 w-4 shrink-0 font-mono" style={{ color: COLOR[status] }} aria-hidden="true">
          {ICON[status]}
        </span>
        <span className="flex-1">{requirement}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 pb-2 text-sm text-text-muted">
        {reason && <p className="mb-1">{reason}</p>}
        {evidenceQuotes.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {evidenceQuotes.map((quote, i) => (
              <li key={i} className="border-l-2 border-border pl-2 italic">
                &ldquo;{quote}&rdquo;
              </li>
            ))}
          </ul>
        ) : (
          <p className="italic">No supporting evidence.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

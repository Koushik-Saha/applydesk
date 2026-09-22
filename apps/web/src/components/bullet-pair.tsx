"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulletPairProps {
  masterText: string;
  tailoredText: string;
  originalKept?: boolean;
  lintWarnings?: string[];
  onChange?: (text: string) => void;
}

// DESIGN.md "Document editor" — split view, left = master (read-only,
// muted), right = tailored (editable). Both halves sit in one row so they
// highlight together on hover ("linked rows") without extra JS state.
export function BulletPair({ masterText, tailoredText, originalKept, lintWarnings = [], onChange }: BulletPairProps) {
  return (
    <div className="group grid grid-cols-2 gap-4 rounded-md px-2 py-2 hover:bg-surface-muted">
      <p className="text-sm text-text-muted">{masterText}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-1.5">
          <textarea
            value={tailoredText}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={!onChange}
            rows={2}
            className={cn(
              "w-full flex-1 resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm leading-snug focus:border-border focus:bg-surface focus:outline-none",
              lintWarnings.length > 0 && "underline decoration-amber-500 decoration-wavy underline-offset-4",
            )}
          />
          {lintWarnings.length > 0 && (
            <span title={lintWarnings.join("\n")} className="mt-1 shrink-0 text-amber-500">
              <AlertTriangle className="size-3.5" />
            </span>
          )}
        </div>
        {originalKept && (
          <span className="w-fit rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">
            Original kept
          </span>
        )}
      </div>
    </div>
  );
}

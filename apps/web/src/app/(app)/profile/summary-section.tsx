"use client";

import { Textarea } from "@/components/ui/textarea";

export function SummarySection({ summary, onChange }: { summary: string; onChange: (next: string) => void }) {
  return (
    <Textarea
      value={summary}
      onChange={(e) => onChange(e.target.value)}
      placeholder="A 2-3 line professional summary..."
      rows={3}
    />
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";

interface JobEvent {
  id: string;
  type: string;
  meta: unknown;
  at: string;
}

const LABELS: Record<string, string> = {
  created: "Job created",
  skipped: "Skipped",
};

export function TimelineTab({ jobId }: { jobId: string }) {
  const query = useQuery({
    queryKey: ["job-events", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/events`);
      if (!res.ok) throw new Error("Failed to load timeline.");
      const body = await res.json();
      return body.events as JobEvent[];
    },
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Failed to load timeline."}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.data.length === 0) {
    return <EmptyState icon={History} message="Nothing has happened yet." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {query.data.map((event) => (
        <li key={event.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
          <span className="font-mono text-xs text-text-muted">{new Date(event.at).toLocaleString()}</span>
          <span>{LABELS[event.type] ?? event.type}</span>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  History,
  PlusCircle,
  FileCheck2,
  FileText,
  CheckCircle2,
  Undo2,
  ArrowRightCircle,
  Ban,
  ExternalLink,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";

interface JobEvent {
  id: string;
  type: string;
  meta: Record<string, unknown> | null;
  at: string;
}

function eventIcon(type: string) {
  switch (type) {
    case "created":
      return <PlusCircle className="size-4 text-[var(--accent)]" />;
    case "analysis_completed":
      return <FileCheck2 className="size-4 text-[var(--met)]" />;
    case "documents_generated":
      return <FileText className="size-4 text-[var(--stretch)]" />;
    case "document_approved":
    case "documents_approved":
      return <CheckCircle2 className="size-4 text-[var(--met)]" />;
    case "documents_unapproved":
      return <Undo2 className="size-4 text-amber-500" />;
    case "status_changed":
      return <ArrowRightCircle className="size-4 text-[var(--accent)]" />;
    case "skipped":
      return <Ban className="size-4 text-stone-400" />;
    default:
      return <History className="size-4 text-text-muted" />;
  }
}

function eventTitle(event: JobEvent): string {
  const meta = event.meta ?? {};
  switch (event.type) {
    case "created":
      return "Job saved";
    case "analysis_completed":
      return `Analysis completed${typeof meta.score === "number" ? ` (Score: ${meta.score})` : ""}`;
    case "documents_generated": {
      const kinds = Array.isArray(meta.kinds) ? meta.kinds.join(" & ") : "documents";
      return `Generated tailored ${kinds}`;
    }
    case "document_approved":
    case "documents_approved":
      return "Documents approved & uploaded to Google Drive";
    case "documents_unapproved":
      return "Documents unapproved (new draft opened)";
    case "status_changed":
      return `Status changed: ${meta.from ?? "?"} → ${meta.to ?? "?"}`;
    case "skipped":
      return "Job marked as skipped";
    default:
      return event.type.replace(/_/g, " ");
  }
}

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
      <div className="flex flex-col gap-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
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
    <div className="relative border-l border-border pl-6 ml-3 space-y-6">
      {query.data.map((event) => {
        const driveFolderLink = event.meta?.driveFolderLink as string | undefined;
        return (
          <div key={event.id} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-[31px] top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-surface shadow-xs">
              {eventIcon(event.type)}
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-text capitalize">
                  {eventTitle(event)}
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {new Date(event.at).toLocaleString()}
                </span>
              </div>

              {driveFolderLink && (
                <div className="pt-1 text-xs">
                  <a
                    href={driveFolderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    Open Drive Folder <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import type { JobStatusValue } from "@applydesk/shared";
import { cn } from "@/lib/utils";

export interface PipelineJob {
  id: string;
  company: string;
  title: string;
  score: number | null;
  band: string | null;
  status: JobStatusValue;
  createdAt: string;
  appliedAt: string | null;
}

interface ColumnDef {
  key: JobStatusValue;
  label: string;
  accentClass: string;
}

const PIPELINE_COLUMNS: ColumnDef[] = [
  { key: "scored", label: "Scored", accentClass: "border-sky-500/50" },
  { key: "draft", label: "Draft", accentClass: "border-amber-500/50" },
  { key: "approved", label: "Approved", accentClass: "border-emerald-500/50" },
  { key: "applied", label: "Applied", accentClass: "border-teal-500/50" },
  { key: "interviewing", label: "Interviewing", accentClass: "border-indigo-500/50" },
  { key: "offer", label: "Offer", accentClass: "border-emerald-600/50" },
  { key: "rejected", label: "Rejected", accentClass: "border-stone-400/50" },
];

function formatAge(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

function scoreBandColor(band: string | null): string {
  switch (band) {
    case "Strong":
      return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";
    case "Good":
      return "text-amber-600 bg-amber-500/10 border-amber-500/30";
    case "Stretch":
      return "text-sky-600 bg-sky-500/10 border-sky-500/30";
    case "Weak":
      return "text-rose-600 bg-rose-500/10 border-rose-500/30";
    default:
      return "text-stone-500 bg-stone-500/10 border-stone-500/20";
  }
}

export function PipelineBoard({ initialJobs }: { initialJobs: PipelineJob[] }) {
  const [jobs, setJobs] = useState<PipelineJob[]>(initialJobs);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobStatusValue | null>(null);

  async function updateStatus(jobId: string, targetStatus: JobStatusValue) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === targetStatus) return;

    const prevJobs = [...jobs];
    // Optimistic update
    setJobs((current) =>
      current.map((j) => (j.id === jobId ? { ...j, status: targetStatus } : j)),
    );

    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status.");
      }

      toast.success(`Moved ${job.company} to ${targetStatus}`);
    } catch {
      setJobs(prevJobs);
      toast.error("Failed to update job status.");
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    setDraggedJobId(id);
  }

  function handleDragOver(e: React.DragEvent, colKey: JobStatusValue) {
    e.preventDefault();
    setDragOverColumn(colKey);
  }

  function handleDragLeave(colKey: JobStatusValue) {
    if (dragOverColumn === colKey) {
      setDragOverColumn(null);
    }
  }

  function handleDrop(e: React.DragEvent, colKey: JobStatusValue) {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/plain") || draggedJobId;
    setDraggedJobId(null);
    if (id) {
      updateStatus(id, colKey);
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth min-h-[550px]">
      {PIPELINE_COLUMNS.map((col) => {
        const columnJobs = jobs.filter((j) => j.status === col.key);
        const isOver = dragOverColumn === col.key;

        return (
          <div
            key={col.key}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface/50 p-3 transition-colors",
              isOver && "border-[var(--accent)] bg-[var(--accent-soft)]/20",
            )}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={() => handleDragLeave(col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text">
                  {col.label}
                </span>
                <span className="font-mono text-xs text-text-muted bg-stone-100 dark:bg-stone-800 rounded-full px-2 py-0.5">
                  {columnJobs.length}
                </span>
              </div>
            </div>

            {/* Job Cards */}
            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto max-h-[680px] p-0.5">
              {columnJobs.map((job) => (
                <div
                  key={job.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, job.id)}
                  onDragEnd={() => setDraggedJobId(null)}
                  className={cn(
                    "group relative flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-3.5 shadow-xs transition-all hover:border-[var(--accent)]/50 hover:shadow-sm cursor-grab active:cursor-grabbing",
                    draggedJobId === job.id && "opacity-40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="block font-medium text-sm text-text hover:text-[var(--accent)] transition-colors truncate"
                      >
                        {job.company}
                      </Link>
                      <p className="text-xs text-text-muted truncate mt-0.5">{job.title}</p>
                    </div>

                    <GripVertical className="size-3.5 text-stone-300 dark:text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/50 text-xs">
                    {typeof job.score === "number" ? (
                      <span
                        className={cn(
                          "font-mono px-1.5 py-0.5 rounded text-[11px] font-semibold border",
                          scoreBandColor(job.band),
                        )}
                      >
                        {job.score}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-text-muted">—</span>
                    )}

                    <span className="font-mono text-[11px] text-text-muted">
                      {formatAge(job.status === "applied" && job.appliedAt ? job.appliedAt : job.createdAt)}
                    </span>
                  </div>
                </div>
              ))}

              {columnJobs.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 py-8 text-center text-xs text-text-muted">
                  No jobs
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

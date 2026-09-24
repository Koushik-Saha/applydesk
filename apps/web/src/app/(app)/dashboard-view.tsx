"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Kanban,
  Table as TableIcon,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PipelineBoard, type PipelineJob } from "./pipeline-board";
import { JobsTable, type JobRow } from "./jobs/jobs-table";
import type { DashboardStats, NeedsAttentionItem } from "@/lib/dashboard/service";

interface DashboardViewProps {
  stats: DashboardStats;
  needsAttention: NeedsAttentionItem[];
  jobs: PipelineJob[];
}

export function DashboardView({ stats, needsAttention, jobs }: DashboardViewProps) {
  const [viewMode, setViewMode] = useState<"board" | "table">("board");

  return (
    <div className="flex flex-col gap-8">
      {/* Top row: 4 Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Saved this week
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-text">
            {stats.savedThisWeek}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Applied this week
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[var(--met)]">
            {stats.appliedThisWeek}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Avg score applied
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-text">
            {stats.avgScoreApplied !== null ? stats.avgScoreApplied : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Response rate
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[var(--accent)]">
            {stats.responseRate !== null ? `${stats.responseRate}%` : "—"}
          </p>
        </div>
      </div>

      {/* Needs Attention panel */}
      {needsAttention.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <Clock className="size-4 text-[var(--accent)]" />
              Needs your attention
            </h2>
            <span className="font-mono text-xs text-text-muted bg-stone-100 dark:bg-stone-800 rounded-full px-2 py-0.5">
              {needsAttention.length}
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {needsAttention.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/jobs/${item.jobId}`}
                      className="font-medium text-sm text-text hover:text-[var(--accent)] truncate"
                    >
                      {item.title}
                    </Link>
                    {item.type === "failed_task" && (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="size-3" /> Failed task
                      </span>
                    )}
                    {item.type === "draft" && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Draft to review
                      </span>
                    )}
                    {item.type === "approved" && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Ready to apply
                      </span>
                    )}
                    {item.type === "needs_scoring" && (
                      <span className="rounded bg-stone-500/10 px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
                        Needs scoring
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{item.subtitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/jobs/${item.jobId}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Open <ExternalLink className="size-3 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main pipeline / table view with view toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text">Application Pipeline</h2>
            <span className="font-mono text-xs text-text-muted">({jobs.length} jobs)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "board"
                    ? "bg-bg text-text shadow-xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Kanban className="size-3.5" />
                Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-bg text-text shadow-xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <TableIcon className="size-3.5" />
                Table
              </button>
            </div>

            <Link
              href="/jobs/new"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              <Plus className="size-3.5 mr-1" />
              Add job
            </Link>
          </div>
        </div>

        {viewMode === "board" ? (
          <PipelineBoard initialJobs={jobs} />
        ) : (
          <JobsTable initialJobs={jobs as JobRow[]} />
        )}
      </div>
    </div>
  );
}

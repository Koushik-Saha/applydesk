"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import type { JobStatusValue } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface JobRow {
  id: string;
  company: string;
  title: string;
  score: number | null;
  band: string | null;
  status: JobStatusValue;
  createdAt: string;
  appliedAt: string | null;
}

const STATUS_FILTERS: { label: string; value: JobStatusValue | undefined }[] = [
  { label: "All", value: undefined },
  { label: "New", value: "new" },
  { label: "Scored", value: "scored" },
  { label: "Approved", value: "approved" },
  { label: "Applied", value: "applied" },
  { label: "Interviewing", value: "interviewing" },
];

const COLUMNS = ["Company", "Title", "Score", "Status", "Saved", "Applied"] as const;

type SortKey = "date" | "score" | "company";

async function fetchJobs(params: { status?: string; q?: string; sort?: SortKey }): Promise<JobRow[]> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  const res = await fetch(`/api/jobs?${search.toString()}`);
  if (!res.ok) throw new Error("Failed to load jobs.");
  const body = await res.json();
  return body.jobs as JobRow[];
}

function scoreColor(band: string | null): string {
  switch (band) {
    case "Strong":
      return "var(--met)";
    case "Good":
      return "var(--partial)";
    case "Stretch":
      return "var(--stretch)";
    case "Weak":
      return "var(--missing)";
    default:
      return "var(--text-muted)";
  }
}

// DESIGN.md "Jobs table" — Company/Title/Score/Status/Saved/Applied,
// sortable, filter chips, search, row click -> job page, j/k/enter.
//
// Note: @tanstack/react-table v9 replaced useReactTable/getCoreRowModel
// with an atom-store "createTableHook" architecture aimed at client-side
// sort/filter/grouping. This table's sort+filter are already server-driven
// (via the API's ?status/?q/?sort params), so none of that machinery buys
// anything here — rendered as a plain typed table instead.
export function JobsTable({ initialJobs }: { initialJobs: JobRow[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatusValue | undefined>(undefined);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isDefaultView = !status && !q && sort === "date";
  const query = useQuery({
    queryKey: ["jobs", status, q, sort],
    queryFn: () => fetchJobs({ status, q, sort }),
    initialData: isDefaultView ? initialJobs : undefined,
  });

  const jobs = useMemo(() => query.data ?? [], [query.data]);

  useEffect(() => setSelectedIndex(0), [jobs.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (document.activeElement === searchInputRef.current) return;
      if (e.key === "j") setSelectedIndex((i) => Math.min(i + 1, jobs.length - 1));
      else if (e.key === "k") setSelectedIndex((i) => Math.max(i - 1, 0));
      else if (e.key === "Enter" && jobs[selectedIndex]) router.push(`/jobs/${jobs[selectedIndex].id}`);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jobs, selectedIndex, router]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.value)}
            className={cn(
              "rounded-full border border-border px-3 py-1 text-xs",
              status === f.value ? "bg-accent-soft text-[var(--accent)]" : "text-text-muted hover:text-text",
            )}
          >
            {f.label}
          </button>
        ))}
        <Input
          ref={searchInputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or company…"
          className="ml-auto max-w-64"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
        >
          <option value="date">Sort: Saved</option>
          <option value="score">Sort: Score</option>
          <option value="company">Sort: Company</option>
        </select>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Failed to load jobs."}
          onRetry={() => query.refetch()}
        />
      ) : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} message="No jobs yet. Save one from the extension or add it manually." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job, i) => (
                <TableRow
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className={cn("cursor-pointer", i === selectedIndex && "bg-surface-muted")}
                >
                  <TableCell>{job.company}</TableCell>
                  <TableCell>{job.title}</TableCell>
                  <TableCell>
                    {job.score != null ? (
                      <span className="font-mono" style={{ color: scoreColor(job.band) }}>
                        {job.score}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-text-muted">{new Date(job.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-text-muted">
                    {job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

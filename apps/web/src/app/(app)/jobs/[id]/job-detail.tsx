"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { JobStatusValue } from "@applydesk/shared";
import type { Requirements, EvidenceItem } from "@/lib/ai/prompts/job-analyze";
import type { JobFlags } from "@/lib/jobs/flags";
import { ScoreRing } from "@/components/score-ring";
import { HighlightedDescription } from "@/components/highlighted-description";
import { RequirementRow } from "@/components/requirement-row";
import { KeywordChip } from "@/components/keyword-chip";
import { StatusBadge } from "@/components/status-badge";
import { TaskProgress, type TaskStep } from "@/components/task-progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimelineTab } from "./timeline-tab";

const ANALYZE_STEPS: TaskStep[] = [
  { key: "extract_requirements", label: "Reading job" },
  { key: "find_evidence", label: "Finding evidence" },
  { key: "score", label: "Scoring" },
];

interface JobDetailAnalysis {
  requirements: Requirements;
  evidence: EvidenceItem[];
  score: number;
  band: string;
  flags: JobFlags;
  keywords: { keywordsFound: string[]; keywordsMissing: string[] };
  createdAt: string;
}

interface JobDetailProps {
  job: {
    id: string;
    title: string;
    company: string;
    url: string | null;
    location: string | null;
    remoteType: string | null;
    rawDescription: string;
    status: JobStatusValue;
    createdAt: string;
  };
  analysis: JobDetailAnalysis | null;
  analyzeTask: { id: string; status: string; currentStep: string | null; error: string | null } | null;
  bulletTextById: Record<string, string>;
}

async function postJson(url: string) {
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Request failed.");
  }
}

// DESIGN.md "Job page" — 60/40 two-column layout, sticky analysis panel,
// tabs below for Resume / Cover letter / Timeline.
export function JobDetail({ job: initialJob, analysis, analyzeTask, bulletTextById }: JobDetailProps) {
  const router = useRouter();
  // Only `job.status` gets optimistic local updates (for instant button
  // feedback); `analysis`/`analyzeTask` only ever change via a fresh
  // server round-trip, so the parent page keys this component to remount
  // with new props instead of trying to patch them in here.
  const [job, setJob] = useState(initialJob);
  const taskId = analyzeTask?.id ?? null;

  const showProgress = job.status === "analyzing" && !!taskId;

  const analyzeMutation = useMutation({
    mutationFn: () => postJson(`/api/jobs/${job.id}/analyze`),
    onSuccess: () => {
      setJob((j) => ({ ...j, status: "analyzing" }));
      // force TaskProgress to mount fresh against the new task by refetching the page
      router.refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to start analysis."),
  });

  const skipMutation = useMutation({
    mutationFn: () => postJson(`/api/jobs/${job.id}/skip`),
    onSuccess: () => {
      setJob((j) => ({ ...j, status: "skipped" }));
      toast.success("Skipped");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to skip."),
  });

  function handleAnalysisDone() {
    router.refresh();
  }

  const mustHaveItems = analysis?.evidence.filter((i) => i.type === "must") ?? [];
  const niceToHaveItems = analysis?.evidence.filter((i) => i.type === "nice") ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[60%_1fr]">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-semibold">{job.title}</h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-text-muted">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
            {job.url && (
              <>
                {" · "}
                <a href={job.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">
                  View posting
                </a>
              </>
            )}
          </p>
          <div className="mt-4">
            {analysis ? (
              <HighlightedDescription
                text={job.rawDescription}
                found={analysis.keywords.keywordsFound}
                missing={analysis.keywords.keywordsMissing}
              />
            ) : (
              <p className="whitespace-pre-wrap text-base leading-relaxed">{job.rawDescription}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        {showProgress ? (
          <TaskProgress taskId={taskId!} steps={ANALYZE_STEPS} onDone={handleAnalysisDone} />
        ) : analysis ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
            <ScoreRing score={analysis.score} band={analysis.band} />

            {(analysis.flags.redFlags.length > 0 ||
              analysis.flags.yearsGap ||
              analysis.flags.clearance ||
              analysis.flags.sponsorship ||
              analysis.flags.locationMismatch) && (
              <div className="flex flex-col gap-1 rounded-md border border-[var(--flag)]/40 bg-[var(--flag)]/10 p-2 text-sm text-[var(--flag)]">
                {analysis.flags.yearsGap && (
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> Fewer years than required
                  </p>
                )}
                {analysis.flags.clearance && (
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> Security clearance mentioned
                  </p>
                )}
                {analysis.flags.sponsorship && (
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> Sponsorship mentioned
                  </p>
                )}
                {analysis.flags.locationMismatch && (
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> Location mismatch
                  </p>
                )}
                {analysis.flags.redFlags.map((flag, i) => (
                  <p key={i} className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> {flag}
                  </p>
                ))}
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-medium text-text-muted">Must have</p>
              {mustHaveItems.length === 0 && <p className="text-sm text-text-muted">None extracted.</p>}
              {mustHaveItems.map((item, i) => (
                <RequirementRow
                  key={i}
                  requirement={item.requirement}
                  status={item.status}
                  reason={item.reason}
                  evidenceQuotes={item.evidenceBulletIds.map((id) => bulletTextById[id]).filter((t): t is string => !!t)}
                />
              ))}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-text-muted">Nice to have</p>
              {niceToHaveItems.length === 0 && <p className="text-sm text-text-muted">None extracted.</p>}
              {niceToHaveItems.map((item, i) => (
                <RequirementRow
                  key={i}
                  requirement={item.requirement}
                  status={item.status}
                  reason={item.reason}
                  evidenceQuotes={item.evidenceBulletIds.map((id) => bulletTextById[id]).filter((t): t is string => !!t)}
                />
              ))}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-text-muted">Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.keywords.keywordsFound.map((k) => (
                  <KeywordChip key={k} label={k} found />
                ))}
                {analysis.keywords.keywordsMissing.map((k) => (
                  <KeywordChip key={k} label={k} found={false} />
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-t border-border pt-3">
              <Button disabled title="Coming soon" className="flex-1">
                Generate
              </Button>
              <Button variant="outline" onClick={() => skipMutation.mutate()} disabled={skipMutation.isPending}>
                Skip
              </Button>
              <Button
                variant="outline"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
              >
                Re-analyze
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-muted">
            No analysis yet.
            <Button
              className="mt-3 w-full"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              Analyze
            </Button>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover letter</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="resume" className="mt-4 text-sm text-text-muted">
            Coming soon.
          </TabsContent>
          <TabsContent value="cover-letter" className="mt-4 text-sm text-text-muted">
            Coming soon.
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <TimelineTab jobId={job.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

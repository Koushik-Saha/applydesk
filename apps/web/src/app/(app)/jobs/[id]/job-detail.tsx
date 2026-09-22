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
import { ResumeEditor, type ResumeVersion } from "./resume-editor";
import { CoverLetterEditor, type CoverLetterVersion } from "./cover-letter-editor";

const ANALYZE_STEPS: TaskStep[] = [
  { key: "extract_requirements", label: "Reading job" },
  { key: "find_evidence", label: "Finding evidence" },
  { key: "score", label: "Scoring" },
];

const GENERATE_STEPS: TaskStep[] = [
  { key: "select", label: "Selecting content" },
  { key: "resume", label: "Writing resume" },
  { key: "cover_letter", label: "Writing cover letter" },
  { key: "save", label: "Saving" },
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
  analyzeTask: {
    id: string;
    status: string;
    currentStep: string | null;
    error: string | null;
  } | null;
  generateTask: {
    id: string;
    status: string;
    currentStep: string | null;
    error: string | null;
  } | null;
  resumeVersions: ResumeVersion[];
  coverLetterVersions: CoverLetterVersion[];
  bulletTextById: Record<string, string>;
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message ?? "Request failed.");
  }
}

// DESIGN.md "Job page" — 60/40 two-column layout, sticky analysis panel,
// tabs below for Resume / Cover letter / Timeline.
export function JobDetail({
  job: initialJob,
  analysis,
  analyzeTask,
  generateTask,
  resumeVersions,
  coverLetterVersions,
  bulletTextById,
}: JobDetailProps) {
  const router = useRouter();
  // Only `job.status` gets optimistic local updates (for instant button
  // feedback); `analysis`/`analyzeTask` only ever change via a fresh
  // server round-trip, so the parent page keys this component to remount
  // with new props instead of trying to patch them in here.
  const [job, setJob] = useState(initialJob);
  const analyzeTaskId = analyzeTask?.id ?? null;
  const generateTaskId = generateTask?.id ?? null;

  const showAnalyzeProgress = job.status === "analyzing" && !!analyzeTaskId;
  const showGenerateProgress = job.status === "generating" && !!generateTaskId;

  const analyzeMutation = useMutation({
    mutationFn: () => postJson(`/api/jobs/${job.id}/analyze`),
    onSuccess: () => {
      setJob((j) => ({ ...j, status: "analyzing" }));
      // force TaskProgress to mount fresh against the new task by refetching the page
      router.refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to start analysis."),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      postJson(`/api/jobs/${job.id}/generate`, { kinds: ["resume", "cover_letter"] }),
    onSuccess: () => {
      setJob((j) => ({ ...j, status: "generating" }));
      router.refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to start generation."),
  });

  const skipMutation = useMutation({
    mutationFn: () => postJson(`/api/jobs/${job.id}/skip`),
    onSuccess: () => {
      setJob((j) => ({ ...j, status: "skipped" }));
      toast.success("Skipped");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to skip."),
  });

  function handleTaskDone() {
    router.refresh();
  }

  const mustHaveItems = analysis?.evidence.filter((i) => i.type === "must") ?? [];
  const niceToHaveItems = analysis?.evidence.filter((i) => i.type === "nice") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[60%_1fr]">
        <div className="flex flex-col gap-4">
          <div className="border-border bg-surface rounded-xl border p-6">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold">{job.title}</h2>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-text-muted text-sm">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
              {job.url && (
                <>
                  {" · "}
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
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
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {job.rawDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          {showAnalyzeProgress ? (
            <TaskProgress taskId={analyzeTaskId!} steps={ANALYZE_STEPS} onDone={handleTaskDone} />
          ) : showGenerateProgress ? (
            <TaskProgress taskId={generateTaskId!} steps={GENERATE_STEPS} onDone={handleTaskDone} />
          ) : analysis ? (
            <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4">
              <ScoreRing score={analysis.score} band={analysis.band} />

              {(analysis.flags.redFlags.length > 0 ||
                analysis.flags.yearsGap ||
                analysis.flags.clearance ||
                analysis.flags.sponsorship ||
                analysis.flags.locationMismatch) && (
                <div className="border-[var(--flag)]/40 bg-[var(--flag)]/10 flex flex-col gap-1 rounded-md border p-2 text-sm text-[var(--flag)]">
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
                <p className="text-text-muted mb-1 text-xs font-medium">Must have</p>
                {mustHaveItems.length === 0 && (
                  <p className="text-text-muted text-sm">None extracted.</p>
                )}
                {mustHaveItems.map((item, i) => (
                  <RequirementRow
                    key={i}
                    requirement={item.requirement}
                    status={item.status}
                    reason={item.reason}
                    evidenceQuotes={item.evidenceBulletIds
                      .map((id) => bulletTextById[id])
                      .filter((t): t is string => !!t)}
                  />
                ))}
              </div>

              <div>
                <p className="text-text-muted mb-1 text-xs font-medium">Nice to have</p>
                {niceToHaveItems.length === 0 && (
                  <p className="text-text-muted text-sm">None extracted.</p>
                )}
                {niceToHaveItems.map((item, i) => (
                  <RequirementRow
                    key={i}
                    requirement={item.requirement}
                    status={item.status}
                    reason={item.reason}
                    evidenceQuotes={item.evidenceBulletIds
                      .map((id) => bulletTextById[id])
                      .filter((t): t is string => !!t)}
                  />
                ))}
              </div>

              <div>
                <p className="text-text-muted mb-1 text-xs font-medium">Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.keywords.keywordsFound.map((k) => (
                    <KeywordChip key={k} label={k} found />
                  ))}
                  {analysis.keywords.keywordsMissing.map((k) => (
                    <KeywordChip key={k} label={k} found={false} />
                  ))}
                </div>
              </div>

              <div className="border-border flex gap-2 border-t pt-3">
                <Button
                  className="flex-1"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  Generate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => skipMutation.mutate()}
                  disabled={skipMutation.isPending}
                >
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
            <div className="border-border bg-surface text-text-muted rounded-xl border p-4 text-sm">
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
      </div>

      <div>
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover letter</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="resume" className="mt-4">
            <ResumeEditor versions={resumeVersions} bulletTextById={bulletTextById} />
          </TabsContent>
          <TabsContent value="cover-letter" className="mt-4">
            <CoverLetterEditor versions={coverLetterVersions} bulletTextById={bulletTextById} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <TimelineTab jobId={job.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

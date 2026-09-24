"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ExternalLink, HardDrive, RefreshCw } from "lucide-react";
import type { JobStatusValue } from "@applydesk/shared";
import type { Requirements, EvidenceItem } from "@/lib/ai/prompts/job-analyze";
import type { JobFlags } from "@/lib/jobs/flags";
import { ScoreRing } from "@/components/score-ring";
import { HighlightedDescription } from "@/components/highlighted-description";
import { RequirementRow } from "@/components/requirement-row";
import { KeywordChip } from "@/components/keyword-chip";
import { StatusBadge } from "@/components/status-badge";
import { TaskProgress, type TaskStep } from "@/components/task-progress";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimelineTab } from "./timeline-tab";
import { ResumeEditor, type ResumeVersion } from "./resume-editor";
import { CoverLetterEditor, type CoverLetterVersion } from "./cover-letter-editor";
import { PdfPreviewTab } from "./pdf-preview-tab";

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

const APPROVE_STEPS: TaskStep[] = [
  { key: "validate", label: "Validating Google Drive & documents" },
  { key: "render", label: "Rendering ATS-safe PDFs" },
  { key: "drive", label: "Uploading to Google Drive folder" },
  { key: "finalize", label: "Finalizing approval" },
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
  approveTask: {
    id: string;
    status: string;
    currentStep: string | null;
    error: string | null;
  } | null;
  jobFolder: {
    folderId: string;
    folderLink: string;
  } | null;
  googleConnected: boolean;
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
  return res.json();
}

// DESIGN.md "Job page" — 60/40 two-column layout, sticky analysis panel,
// tabs below for Resume / Cover letter / Preview (PDF) / Timeline.
export function JobDetail({
  job: initialJob,
  analysis,
  analyzeTask,
  generateTask,
  approveTask,
  jobFolder,
  googleConnected,
  resumeVersions,
  coverLetterVersions,
  bulletTextById,
}: JobDetailProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);

  const analyzeTaskId = analyzeTask?.id ?? null;
  const generateTaskId = generateTask?.id ?? null;
  const approveTaskId = approveTask?.id ?? null;

  const showAnalyzeProgress = job.status === "analyzing" && !!analyzeTaskId;
  const showGenerateProgress = job.status === "generating" && !!generateTaskId;
  const showApproveProgress =
    approveTask &&
    (approveTask.status === "running" || approveTask.status === "queued") &&
    job.status !== "approved";

  const hasDocuments = resumeVersions.length > 0 || coverLetterVersions.length > 0;

  const analyzeMutation = useMutation({
    mutationFn: () => postJson(`/api/jobs/${job.id}/analyze`),
    onSuccess: () => {
      setJob((j) => ({ ...j, status: "analyzing" }));
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

  const approveMutation = useMutation({
    mutationFn: () => postJson(`/api/jobs/${job.id}/approve`),
    onSuccess: () => {
      toast.success("Approval started.");
      router.refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to approve documents."),
  });

  const unapproveMutation = useMutation({
    mutationFn: () => postJson(`/api/jobs/${job.id}/unapprove`),
    onSuccess: () => {
      setJob((j) => ({ ...j, status: "draft" }));
      toast.success("Document unapproved. New draft created.");
      router.refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to unapprove."),
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

  const isDriveError =
    approveTask?.status === "failed" &&
    (approveTask.error?.toLowerCase().includes("google") ||
      approveTask.error?.toLowerCase().includes("drive") ||
      approveTask.error?.toLowerCase().includes("revoked") ||
      approveTask.error?.toLowerCase().includes("quota"));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[60%_1fr]">
        <div className="flex flex-col gap-4">
          <div className="border-border bg-surface rounded-xl border p-6">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text">{job.title}</h2>
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
                <p className="text-text-muted whitespace-pre-wrap text-sm">{job.rawDescription}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {showAnalyzeProgress && (
            <TaskProgress taskId={analyzeTaskId!} steps={ANALYZE_STEPS} onDone={handleTaskDone} />
          )}

          {showGenerateProgress && (
            <TaskProgress
              taskId={generateTaskId!}
              steps={GENERATE_STEPS}
              onDone={handleTaskDone}
            />
          )}

          {showApproveProgress && (
            <TaskProgress taskId={approveTaskId!} steps={APPROVE_STEPS} onDone={handleTaskDone} />
          )}

          {approveTask?.status === "failed" && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="font-medium">Approval failed</p>
                  <p className="text-xs text-rose-600 dark:text-rose-400">{approveTask.error}</p>
                  <div className="flex gap-2 pt-1">
                    {isDriveError && (
                      <a
                        href="/api/google/connect"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Connect Google Drive
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Spinner className="size-3.5 mr-1" />
                      ) : (
                        <RefreshCw className="size-3.5 mr-1" />
                      )}
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysis ? (
            <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={analysis.score} band={analysis.band} />
                <div>
                  <p className="font-mono text-xs uppercase text-text-muted">Fit score</p>
                  <p className="text-sm font-medium capitalize text-text">{analysis.band} match</p>
                  <p className="text-xs text-text-muted">
                    {analysis.keywords.keywordsFound.length} of{" "}
                    {analysis.keywords.keywordsFound.length +
                      analysis.keywords.keywordsMissing.length}{" "}
                    keywords
                  </p>
                </div>
              </div>

              {(analysis.flags.yearsGap ||
                analysis.flags.clearance ||
                analysis.flags.sponsorship ||
                analysis.flags.locationMismatch ||
                analysis.flags.redFlags.length > 0) && (
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
                  className="flex-1 gap-1.5"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending && <Spinner />}
                  Generate
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => skipMutation.mutate()}
                  disabled={skipMutation.isPending}
                >
                  {skipMutation.isPending && <Spinner />}
                  Skip
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending && <Spinner />}
                  Re-analyze
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-border bg-surface text-text-muted rounded-xl border p-4 text-sm">
              No analysis yet.
              <Button
                className="mt-3 w-full gap-1.5"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending && <Spinner />}
                Analyze
              </Button>
            </div>
          )}
        </div>
      </div>

      {hasDocuments && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            {job.status === "approved" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                {jobFolder?.folderLink ? "Approved & Synced to Google Drive" : "Approved"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                Draft Documents
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {job.status === "approved" ? (
              <>
                {jobFolder?.folderLink && (
                  <a
                    href={jobFolder.folderLink}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <HardDrive className="size-3.5 mr-1.5" />
                    Google Drive Folder
                    <ExternalLink className="size-3 ml-1" />
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => unapproveMutation.mutate()}
                  disabled={unapproveMutation.isPending}
                >
                  {unapproveMutation.isPending && <Spinner className="size-3.5" />}
                  Unapprove (Edit Draft)
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {!googleConnected && (
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <AlertTriangle className="size-3.5" />
                    Drive not connected — will approve without a Drive copy
                  </span>
                )}
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending && <Spinner className="size-3.5" />}
                  {googleConnected ? "Approve & Save to Drive" : "Approve"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <Tabs defaultValue={hasDocuments ? "resume" : "timeline"}>
          <TabsList>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover letter</TabsTrigger>
            <TabsTrigger value="preview">Preview (PDF)</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="resume" className="mt-4">
            <ResumeEditor versions={resumeVersions} bulletTextById={bulletTextById} />
          </TabsContent>
          <TabsContent value="cover-letter" className="mt-4">
            <CoverLetterEditor versions={coverLetterVersions} bulletTextById={bulletTextById} />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <PdfPreviewTab
              resumeVersions={resumeVersions}
              coverLetterVersions={coverLetterVersions}
              jobCompany={job.company}
            />
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <TimelineTab jobId={job.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

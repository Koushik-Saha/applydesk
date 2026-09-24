import { useState, useEffect, useRef } from "react";
import {
  createApplyDeskClient,
  extractJob,
  emptyStandardAnswers,
  bandForScore,
  type ExtJobSummary,
  type FillResultEntry,
  type StandardAnswers,
  type ExtensionJobInput,
} from "@applydesk/shared";
import {
  Settings as SettingsIcon,
  Send,
  Sparkles,
  FileCheck2,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { getExtensionConfig, type ExtensionConfig } from "../../lib/storage";
import { MiniScoreRing } from "./score-ring";

type TabKind = "save" | "apply";
type ConnectionStatus = "checking" | "connected" | "disconnected";

// Firefox exposes `browser`, Chrome only `chrome` — fall back to whichever
// is present rather than assuming WXT's `browser` polyfill loaded.
function getScriptingApi(): typeof browser.scripting | undefined {
  if (typeof browser !== "undefined" && browser.scripting) return browser.scripting;
  const globalChrome = (globalThis as { chrome?: { scripting?: typeof browser.scripting } }).chrome;
  return globalChrome?.scripting;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKind>("save");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const [config, setConfig] = useState<ExtensionConfig | null>(null);

  // Save Job tab state
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [atsType, setAtsType] = useState<ExtensionJobInput["atsType"]>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [pageSelection, setPageSelection] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "duplicate" | "error";
    message: string;
    jobId?: string;
  } | null>(null);
  const [analyzeTaskId, setAnalyzeTaskId] = useState<string | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState<"running" | "done" | "failed" | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<{ score: number; band: string } | null>(null);

  // Apply tab state
  const [approvedJobs, setApprovedJobs] = useState<ExtJobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [suggestedJobId, setSuggestedJobId] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<string | null>(null);
  const [applyResults, setApplyResults] = useState<FillResultEntry[] | null>(null);
  const [applyBusy, setApplyBusy] = useState<"fill_attach" | "attach_only" | "fill_only" | null>(null);
  const [markingApplied, setMarkingApplied] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Load config & active page info on mount
  useEffect(() => {
    checkConnection();
    readActiveTabInfo();
  }, []);

  // DESIGN.md §10 — "description preview (4 lines, expandable)": grow with
  // content up to a cap, past which it scrolls instead of taking over the
  // popup.
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [description]);

  async function checkConnection() {
    setConnectionStatus("checking");
    const cfg = await getExtensionConfig();
    setConfig(cfg);

    if (!cfg.token.trim()) {
      setConnectionStatus("disconnected");
      return;
    }

    try {
      const client = createApplyDeskClient({
        baseUrl: cfg.apiBaseUrl,
        token: cfg.token,
      });
      const res = await client.testConnection();
      if (res.ok) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  }

  async function readActiveTabInfo() {
    setIsExtracting(true);
    try {
      if (typeof browser !== "undefined" && browser.tabs) {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        if (tab.url) setUrl(tab.url);

        let extractedSuccess = false;

        // Try DOM extraction via scripting API
        const scriptingApi = getScriptingApi();

        if (tab.id && scriptingApi?.executeScript) {
          try {
            const results = await scriptingApi.executeScript({
              target: { tabId: tab.id },
              func: () => {
                return {
                  html: document.documentElement.outerHTML,
                  url: window.location.href,
                  selection: window.getSelection()?.toString() || "",
                };
              },
            });

            const injection = results?.[0];
            if (injection?.result) {
              const { html, url: pageUrl, selection } = injection.result as {
                html: string;
                url: string;
                selection: string;
              };

              if (selection && selection.trim().length > 0) {
                setHasSelection(true);
                setPageSelection(selection.trim());
              }

              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");
              const extracted = extractJob(doc, {
                url: pageUrl || tab.url,
                selection: selection?.trim() || undefined,
              });

              if (extracted.title) setTitle(extracted.title);
              if (extracted.company) setCompany(extracted.company);
              if (extracted.description) setDescription(extracted.description);
              if (extracted.url) setUrl(extracted.url);
              if (extracted.atsType && extracted.atsType !== "other") setAtsType(extracted.atsType);

              if (extracted.title && (extracted.company || extracted.description)) {
                extractedSuccess = true;
              }
            }
          } catch (scriptErr) {
            console.warn("DOM extraction via scripting failed, falling back:", scriptErr);
          }
        }

        // Fallback to tab.title if title or company wasn't found
        if (!extractedSuccess && tab.title) {
          const atMatch = tab.title.match(/^(.*?)\s+at\s+([A-Za-z0-9&.\- ]+?)(?:\s*\(|\s*[-–—|]|\s*$)/i);
          const titleMatch = atMatch?.[1]?.trim();
          const compMatch = atMatch?.[2]?.trim();
          if (titleMatch && compMatch) {
            setTitle((prev) => prev || titleMatch);
            setCompany((prev) => prev || compMatch);
          } else {
            const parts = tab.title.split(/[-–—|]/).map((s) => s.trim());
            const p0 = parts[0] || "";
            const p1 = parts[1] || "";
            if (p0 && p1) {
              setTitle((prev) => prev || p0);
              setCompany((prev) => prev || p1);
            } else if (p0) {
              setTitle((prev) => prev || p0);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not query active tab:", err);
    } finally {
      setIsExtracting(false);
    }
  }

  // Load approved jobs when switching to Apply tab
  useEffect(() => {
    if (activeTab === "apply" && connectionStatus === "connected" && config?.token) {
      loadApprovedJobs();
    }
  }, [activeTab, connectionStatus]);

  // Poll the job_analyze task started by saveJob so the popup can show a
  // live score instead of a static "analysis started" message.
  useEffect(() => {
    if (!analyzeTaskId || analyzeStatus !== "running" || !config?.token) return;

    let cancelled = false;
    const client = createApplyDeskClient({ baseUrl: config.apiBaseUrl, token: config.token });

    const interval = setInterval(async () => {
      try {
        const task = await client.getTaskStatus(analyzeTaskId);
        if (cancelled) return;
        if (task.status === "done") {
          setAnalyzeStatus("done");
          if (task.result?.score !== undefined && task.result?.band) {
            setAnalyzeResult({ score: task.result.score, band: task.result.band });
          }
        } else if (task.status === "failed") {
          setAnalyzeStatus("failed");
        }
      } catch (err) {
        console.warn("Failed to poll analysis task:", err);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [analyzeTaskId, analyzeStatus, config]);

  async function loadApprovedJobs() {
    if (!config?.token) return;
    setLoadingJobs(true);
    setApplyFeedback(null);
    try {
      const client = createApplyDeskClient({
        baseUrl: config.apiBaseUrl,
        token: config.token,
      });
      const res = await client.getApprovedJobs({ url, company });
      setApprovedJobs(res.jobs);
      if (res.suggestedJobId) {
        setSuggestedJobId(res.suggestedJobId);
        setSelectedJobId(res.suggestedJobId);
      } else if (res.jobs.length > 0 && res.jobs[0]) {
        setSelectedJobId(res.jobs[0].id);
      }
    } catch (err) {
      console.error("Failed to load approved jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function handleSendJob(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) return;
    if (!config?.token) return;

    setIsSending(true);
    setSaveFeedback(null);
    setAnalyzeTaskId(null);
    setAnalyzeStatus(null);
    setAnalyzeResult(null);

    try {
      const client = createApplyDeskClient({
        baseUrl: config.apiBaseUrl,
        token: config.token,
      });

      const res = await client.saveJob({
        title: title.trim(),
        company: company.trim(),
        url: url.trim() || window.location.href,
        description: description.trim(),
        atsType,
      });

      if (res.duplicate) {
        setSaveFeedback({
          type: "duplicate",
          message:
            res.job.score != null
              ? `Already saved — score ${res.job.score}.`
              : "Already saved — job is in your pipeline.",
          jobId: res.job.id,
        });
      } else {
        setSaveFeedback({
          type: "success",
          message: "Job saved! Analyzing your fit...",
          jobId: res.job.id,
        });
        if (res.taskId) {
          setAnalyzeTaskId(res.taskId);
          setAnalyzeStatus("running");
        }
      }
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save job.",
      });
    } finally {
      setIsSending(false);
    }
  }

  function sanitizeFilenamePart(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "Application";
  }

  function companyInitial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
  }

  const selectedJob = approvedJobs.find((j) => j.id === selectedJobId) ?? null;

  // chrome.scripting.executeScript's `args` must be JSON-serializable, not
  // just structured-cloneable — an ArrayBuffer fails with "Unserializable
  // argument passed." Encode to base64 here and decode it back inside the
  // injected function (which has no access to this outer scope).
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  // Fills fields and/or attaches PDFs on the active tab's form.
  // PROJECT_SPEC.md §5.2 — never clicks anything; the user reviews and
  // submits themselves. Runs in two injections because `files` injection
  // can't take arguments and `func` injection can't import modules: first
  // load the bundled fill engine (apply-fill.js), then invoke it with the
  // job's answers/PDFs via a small self-contained function.
  async function handleApplyAction(mode: "fill_attach" | "attach_only" | "fill_only") {
    if (!selectedJobId || !config?.token) return;

    setApplyBusy(mode);
    setApplyFeedback(null);
    setApplyResults(null);

    try {
      const client = createApplyDeskClient({
        baseUrl: config.apiBaseUrl,
        token: config.token,
      });

      const wantsFill = mode !== "attach_only";
      const wantsAttach = mode !== "fill_only";

      const [answers, resumeBlob, coverLetterBlob] = await Promise.all([
        wantsFill ? client.getStandardAnswers() : Promise.resolve(emptyStandardAnswers()),
        wantsAttach ? client.getJobPdf(selectedJobId, "resume").catch(() => null) : Promise.resolve(null),
        wantsAttach
          ? client.getJobPdf(selectedJobId, "cover_letter").catch(() => null)
          : Promise.resolve(null),
      ]);

      const resumeBase64 = resumeBlob ? arrayBufferToBase64(await resumeBlob.arrayBuffer()) : null;
      const coverLetterBase64 = coverLetterBlob
        ? arrayBufferToBase64(await coverLetterBlob.arrayBuffer())
        : null;

      const job = approvedJobs.find((j) => j.id === selectedJobId);
      const namePrefix = sanitizeFilenamePart(
        job ? `${job.company} - ${job.title}` : "Application",
      );

      if (typeof browser === "undefined" || !browser.tabs) {
        throw new Error("Browser tabs API unavailable.");
      }
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found.");

      const scriptingApi = getScriptingApi();
      if (!scriptingApi?.executeScript) throw new Error("Scripting API unavailable.");

      // Load the fill engine onto the page (idempotent — safe to re-inject).
      await scriptingApi.executeScript({ target: { tabId: tab.id }, files: ["/apply-fill.js"] });

      const [injection] = await scriptingApi.executeScript({
        target: { tabId: tab.id },
        func: (
          answersArg: StandardAnswers,
          resumeBase64Arg: string | null,
          coverLetterBase64Arg: string | null,
          resumeFilename: string,
          coverLetterFilename: string,
          optionsArg: { fillFields: boolean; attachFiles: boolean },
        ) => {
          // Self-contained: this function is serialized and re-executed in
          // the page, so it can't reference anything from the popup's scope.
          function base64ToArrayBuffer(base64: string): ArrayBuffer {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes.buffer;
          }

          return window.__applydeskFill!(
            answersArg,
            {
              resumeBytes: resumeBase64Arg ? base64ToArrayBuffer(resumeBase64Arg) : undefined,
              coverLetterBytes: coverLetterBase64Arg
                ? base64ToArrayBuffer(coverLetterBase64Arg)
                : undefined,
              resumeFilename,
              coverLetterFilename,
            },
            optionsArg,
          );
        },
        args: [
          answers,
          resumeBase64,
          coverLetterBase64,
          `${namePrefix} - Resume.pdf`,
          `${namePrefix} - Cover Letter.pdf`,
          { fillFields: wantsFill, attachFiles: wantsAttach },
        ],
      });

      const results = (injection?.result ?? []) as FillResultEntry[];
      setApplyResults(results);
      if (results.length === 0) {
        setApplyFeedback("No recognizable fields or file inputs found on this page.");
      }
    } catch (err) {
      setApplyFeedback(err instanceof Error ? err.message : "Failed to fill/attach this form.");
    } finally {
      setApplyBusy(null);
    }
  }

  async function handleMarkApplied() {
    if (!selectedJobId || !config?.token) return;
    setMarkingApplied(true);
    try {
      const client = createApplyDeskClient({
        baseUrl: config.apiBaseUrl,
        token: config.token,
      });
      await client.markApplied(selectedJobId);
      setApplyFeedback("Marked as applied in your ApplyDesk pipeline!");
    } catch (err) {
      setApplyFeedback(err instanceof Error ? err.message : "Failed to mark as applied.");
    } finally {
      setMarkingApplied(false);
    }
  }

  function openOptions() {
    if (typeof browser !== "undefined" && browser.runtime?.openOptionsPage) {
      browser.runtime.openOptionsPage();
    } else {
      window.open("options.html", "_blank");
    }
  }

  function openApplyDeskDashboard() {
    const targetUrl = config?.apiBaseUrl || "http://localhost:3000";
    if (typeof browser !== "undefined" && browser.tabs) {
      browser.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, "_blank");
    }
  }

  function openJobInApplyDesk(jobId: string) {
    const base = config?.apiBaseUrl || "http://localhost:3000";
    const targetUrl = `${base.replace(/\/+$/, "")}/jobs/${jobId}`;
    if (typeof browser !== "undefined" && browser.tabs) {
      browser.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, "_blank");
    }
  }

  return (
    <div className="w-[360px] min-h-[520px] bg-bg text-text flex flex-col font-sans select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-sm">
            A
          </div>
          <span className="text-[15px] font-semibold text-text tracking-tight">ApplyDesk</span>
          {/* Connection dot */}
          <span
            role="status"
            aria-label={
              connectionStatus === "connected"
                ? "Connected to ApplyDesk"
                : connectionStatus === "checking"
                  ? "Checking connection..."
                  : "Not connected (click gear to configure)"
            }
            className={`size-2 rounded-full transition-colors ${
              connectionStatus === "connected"
                ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                : connectionStatus === "checking"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-stone-300 dark:bg-stone-600"
            }`}
            title={
              connectionStatus === "connected"
                ? "Connected to ApplyDesk"
                : connectionStatus === "checking"
                  ? "Checking connection..."
                  : "Not connected (click gear to configure)"
            }
          />
        </div>

        <button
          type="button"
          onClick={openOptions}
          aria-label="Extension Settings"
          title="Extension Settings"
          className="text-text-muted hover:text-text p-1.5 rounded-md hover:bg-surface-muted transition-colors"
        >
          <SettingsIcon className="size-4" />
        </button>
      </header>

      {/* Disconnected Banner */}
      {connectionStatus === "disconnected" && (
        <div className="mx-4 mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-3 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="truncate">Not connected to ApplyDesk</span>
          </div>
          <button
            type="button"
            onClick={openOptions}
            className="shrink-0 font-medium text-amber-900 dark:text-amber-100 underline hover:no-underline"
          >
            Configure
          </button>
        </div>
      )}

      {/* Tabs — segmented pill control */}
      <div className="mx-4 mb-1 flex items-center gap-0.5 rounded-lg bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab("save")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium text-center transition-all ${
            activeTab === "save"
              ? "bg-surface text-text shadow-sm font-semibold"
              : "text-text-muted hover:text-text"
          }`}
        >
          Save job
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("apply")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium text-center transition-all ${
            activeTab === "apply"
              ? "bg-surface text-text shadow-sm font-semibold"
              : "text-text-muted hover:text-text"
          }`}
        >
          Apply
        </button>
      </div>

      {/* Tab Content */}
      <main className="flex-1 px-4 pb-4 pt-1 overflow-y-auto">
        {activeTab === "save" && (
          <div className="space-y-3">
            {/* Extraction indicator or highlighted text banner */}
            {isExtracting ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-muted text-xs text-text-muted">
                <RefreshCw className="size-3 animate-spin text-accent" />
                <span>Reading page details...</span>
              </div>
            ) : hasSelection && pageSelection && description !== pageSelection ? (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-accent-soft border border-accent/20 text-xs">
                <span className="truncate text-text-muted text-[11px]">
                  Captured highlight ({pageSelection.length} chars)
                </span>
                <button
                  type="button"
                  onClick={() => setDescription(pageSelection)}
                  className="shrink-0 text-accent font-semibold hover:underline text-[11px]"
                >
                  Use highlight
                </button>
              </div>
            ) : null}

            {/* Job card — mirrors the detected-posting card pattern, grouping
                title/company/description into one cohesive unit instead of
                three separate unlabeled fields. */}
            <form id="save-job-form" onSubmit={handleSendJob} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
              <div className="flex items-start gap-2.5 p-3 border-b border-border">
                <div
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent"
                >
                  {company.trim() ? companyInitial(company) : "?"}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    id="job-title"
                    aria-label="Job title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Job title"
                    required
                    className="w-full bg-transparent text-sm font-semibold text-text placeholder:text-text-muted placeholder:font-normal focus:outline-none"
                  />
                  <input
                    id="job-company"
                    aria-label="Company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company"
                    required
                    className="w-full bg-transparent text-xs text-text-muted focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="job-desc" className="block text-[11px] font-medium text-text-muted">
                    Job description
                  </label>
                  <button
                    type="button"
                    onClick={() => readActiveTabInfo()}
                    disabled={isExtracting}
                    className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-accent disabled:opacity-50 transition-colors"
                    title="Re-extract from current page"
                  >
                    <RefreshCw className={`size-2.5 ${isExtracting ? "animate-spin" : ""}`} />
                    <span>Re-extract</span>
                  </button>
                </div>
                <textarea
                  id="job-desc"
                  ref={descriptionRef}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste job description or highlight text on page..."
                  required
                  className="w-full rounded-md border border-border bg-bg p-2 text-xs text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed max-h-60 overflow-y-auto"
                />
              </div>
            </form>

            <button
              type="submit"
              form="save-job-form"
              disabled={isSending || !title.trim() || !company.trim() || !description.trim() || connectionStatus !== "connected"}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {isSending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
              {isSending ? "Sending..." : "Send to ApplyDesk"}
            </button>

            {/* Save feedback */}
            {saveFeedback && (
              <div
                className={`rounded-xl border p-3 text-xs space-y-2 ${
                  saveFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : saveFeedback.type === "duplicate"
                      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                      : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {saveFeedback.type === "success" ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : saveFeedback.type === "duplicate" ? (
                    <Sparkles className="size-3.5 text-amber-600" />
                  ) : (
                    <AlertCircle className="size-3.5 text-rose-600" />
                  )}
                  <span>{saveFeedback.message}</span>
                </div>

                {saveFeedback.type === "success" && analyzeStatus === "running" && (
                  <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                    <RefreshCw className="size-3 animate-spin" />
                    <span>Analyzing your fit against your profile...</span>
                  </div>
                )}

                {saveFeedback.type === "success" && analyzeStatus === "done" && analyzeResult && (
                  <MiniScoreRing score={analyzeResult.score} band={analyzeResult.band} />
                )}

                {saveFeedback.type === "success" && analyzeStatus === "failed" && (
                  <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                    <AlertCircle className="size-3 shrink-0" />
                    <span>Analysis failed — check ApplyDesk for details.</span>
                  </div>
                )}

                {saveFeedback.jobId && (
                  <button
                    type="button"
                    onClick={() => openJobInApplyDesk(saveFeedback.jobId!)}
                    className="text-[11px] underline hover:no-underline inline-flex items-center gap-1 opacity-90"
                  >
                    Open in ApplyDesk <ExternalLink className="size-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "apply" && (
          <div className="space-y-4">
            {loadingJobs ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
                <RefreshCw className="size-5 animate-spin text-accent" />
                <span>Finding approved applications...</span>
              </div>
            ) : approvedJobs.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                  <FileCheck2 className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-text">No approved jobs ready to apply</p>
                  <p className="text-[11px] text-text-muted px-4 leading-relaxed">
                    Tailor and approve a resume on ApplyDesk before filling applications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openApplyDeskDashboard}
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-medium"
                >
                  Open ApplyDesk Dashboard <ExternalLink className="size-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Job selector */}
                <div className="space-y-1">
                  <label htmlFor="approved-job-select" className="block text-[11px] font-medium text-text-muted">
                    Select approved job
                  </label>
                  <div className="relative">
                    <select
                      id="approved-job-select"
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full appearance-none rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent pr-8"
                    >
                      {approvedJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.company} — {j.title} {j.id === suggestedJobId ? "(Suggested match)" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                  </div>
                </div>

                {/* Selected job card with score — mirrors the "Strong Resume
                    Match" card pattern: avatar, title, and a score ring the
                    user can see before committing to Fill + attach. */}
                {selectedJob && (
                  <div className="rounded-xl border border-border bg-surface shadow-sm p-3 flex items-center gap-3">
                    <div
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent"
                    >
                      {companyInitial(selectedJob.company)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{selectedJob.title}</p>
                      <p className="text-xs text-text-muted truncate">{selectedJob.company}</p>
                    </div>
                    {typeof selectedJob.score === "number" && (
                      <MiniScoreRing
                        score={selectedJob.score}
                        band={bandForScore(selectedJob.score)}
                        size={40}
                      />
                    )}
                  </div>
                )}

                {/* Action buttons per DESIGN.md §10 */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyAction("fill_attach")}
                    disabled={applyBusy !== null}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {applyBusy === "fill_attach" ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Fill + attach
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyAction("attach_only")}
                      disabled={applyBusy !== null}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text hover:bg-surface-muted disabled:opacity-50 transition-colors"
                    >
                      {applyBusy === "attach_only" ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <Paperclip className="size-3" />
                      )}
                      Attach files only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyAction("fill_only")}
                      disabled={applyBusy !== null}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-text hover:bg-surface-muted disabled:opacity-50 transition-colors"
                    >
                      {applyBusy === "fill_only" ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <FileText className="size-3" />
                      )}
                      Fill fields only
                    </button>
                  </div>
                </div>

                {applyFeedback && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                    <span>{applyFeedback}</span>
                  </div>
                )}

                {applyResults && applyResults.length > 0 && (
                  <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                    {applyResults.map((result, i) => (
                      <div key={`${result.label}-${i}`} className="flex items-start gap-1.5 px-2.5 py-1.5 text-[11px]">
                        {result.status === "needs_you" ? (
                          <AlertCircle className="size-3 text-amber-500 shrink-0 mt-0.5" />
                        ) : result.status === "attached" ? (
                          <Paperclip className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <span className="flex-1 text-text">
                          {result.label}
                          <span className="text-text-muted">
                            {" — "}
                            {result.status === "needs_you"
                              ? result.reason || "Needs you"
                              : result.status === "attached"
                                ? "Attached"
                                : "Filled"}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mark as applied action at bottom */}
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={handleMarkApplied}
                    disabled={markingApplied}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted disabled:opacity-50 transition-colors"
                  >
                    {markingApplied && <RefreshCw className="size-3 animate-spin" />}
                    {markingApplied ? "Marking..." : "Mark as applied"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

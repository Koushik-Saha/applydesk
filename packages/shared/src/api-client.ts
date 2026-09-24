import type { ExtensionJobInput } from "./schemas/job";
import type { StandardAnswers } from "./schemas/standard-answers";

export interface ApplyDeskClientConfig {
  baseUrl: string;
  token: string;
  fetch?: typeof fetch;
}

export interface ExtJobSummary {
  id: string;
  company: string;
  title: string;
  url: string | null;
  status: string;
  atsType?: string | null;
  score?: number | null;
  createdAt?: string | null;
}

export interface ExtApprovedJobsResponse {
  jobs: ExtJobSummary[];
  suggestedJobId?: string | null;
}

export interface ExtSaveJobResponse {
  job: ExtJobSummary;
  duplicate: boolean;
  taskId?: string;
}

export interface ExtTaskStatus {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  currentStep: string | null;
  error: string | null;
  result: { score?: number; band?: string } | null;
}

export interface ExtHealthResponse {
  ok: boolean;
  ownerId?: string;
  error?: string;
}

export class ApplyDeskApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApplyDeskApiError";
  }
}

export class ApplyDeskClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ApplyDeskClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.token = config.token.trim();
    this.fetchImpl = config.fetch ?? (typeof window !== "undefined" ? window.fetch.bind(window) : fetch);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers(options.headers);

    headers.set("Authorization", `Bearer ${this.token}`);
    if (options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await this.fetchImpl(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let code = "UNKNOWN_ERROR";
      let message = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          if (typeof errorJson.error === "string") {
            message = errorJson.error;
          } else if (errorJson.error.message) {
            message = errorJson.error.message;
            code = errorJson.error.code ?? code;
          }
        }
        if (errorJson.code) code = errorJson.code;
        if (errorJson.message) message = errorJson.message;
      } catch {
        // response was not JSON
      }
      throw new ApplyDeskApiError(response.status, code, message);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Health / connection check using the extension token.
   * Returns { ok: true, ownerId } on success.
   */
  async testConnection(): Promise<ExtHealthResponse> {
    try {
      const data = await this.request<ExtHealthResponse>("/api/ext/health");
      return { ok: true, ownerId: data.ownerId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: message };
    }
  }

  /**
   * Fetches the owner's standard answers for form autofill.
   */
  async getStandardAnswers(): Promise<StandardAnswers> {
    const data = await this.request<{ answers: StandardAnswers }>("/api/ext/answers");
    return data.answers;
  }

  /**
   * Saves a job detected by the extension from the active webpage.
   * If not duplicate, kicks off the AI analysis pipeline on the site.
   */
  async saveJob(input: ExtensionJobInput): Promise<ExtSaveJobResponse> {
    return this.request<ExtSaveJobResponse>("/api/ext/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /**
   * Lists approved jobs for the Apply tab dropdown, with optional auto-suggest
   * based on the current page's URL or company name.
   */
  async getApprovedJobs(params?: {
    url?: string;
    company?: string;
  }): Promise<ExtApprovedJobsResponse> {
    const query = new URLSearchParams({ status: "approved" });
    if (params?.url) query.set("url", params.url);
    if (params?.company) query.set("company", params.company);

    return this.request<ExtApprovedJobsResponse>(`/api/ext/jobs?${query.toString()}`);
  }

  /**
   * Fetches the generated PDF bytes for resume or cover letter.
   */
  async getJobPdf(jobId: string, kind: "resume" | "cover_letter"): Promise<Blob> {
    const url = `${this.baseUrl}/api/ext/jobs/${encodeURIComponent(jobId)}/files/${kind}`;
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${this.token}`);

    const response = await this.fetchImpl(url, { headers });
    if (!response.ok) {
      throw new ApplyDeskApiError(
        response.status,
        "PDF_FETCH_FAILED",
        `Failed to fetch ${kind} PDF: status ${response.status}`,
      );
    }
    return response.blob();
  }

  /**
   * Polls a task's status (e.g. the job_analyze task started by saveJob) so
   * the popup can show live progress and the resulting score.
   */
  async getTaskStatus(taskId: string): Promise<ExtTaskStatus> {
    const data = await this.request<{ task: ExtTaskStatus }>(`/api/tasks/${encodeURIComponent(taskId)}`);
    return data.task;
  }

  /**
   * Marks a job as applied after the user submits the form.
   */
  async markApplied(jobId: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(`/api/ext/jobs/${encodeURIComponent(jobId)}/applied`, {
      method: "POST",
    });
  }
}

export function createApplyDeskClient(config: ApplyDeskClientConfig): ApplyDeskClient {
  return new ApplyDeskClient(config);
}

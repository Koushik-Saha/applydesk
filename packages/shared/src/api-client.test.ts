import { describe, it, expect, vi } from "vitest";
import { createApplyDeskClient, ApplyDeskApiError } from "./api-client";

describe("ApplyDeskClient", () => {
  const baseUrl = "https://applydesk.example.com";
  const token = "ad_1234567890abcdef1234567890abcdef";

  it("adds Bearer authorization header and strips trailing slash", async () => {
    let capturedUrl = "";
    let capturedHeaders: Headers | undefined;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true, ownerId: "user_1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createApplyDeskClient({
      baseUrl: `${baseUrl}/`,
      token,
      fetch: mockFetch,
    });

    const result = await client.testConnection();

    expect(result).toEqual({ ok: true, ownerId: "user_1" });
    expect(capturedUrl).toBe("https://applydesk.example.com/api/ext/health");
    expect(capturedHeaders?.get("Authorization")).toBe(`Bearer ${token}`);
  });

  it("handles testConnection failure gracefully", async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({ error: { message: "Invalid or revoked token.", code: "unauthorized" } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    });

    const client = createApplyDeskClient({ baseUrl, token, fetch: mockFetch });
    const result = await client.testConnection();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Invalid or revoked token.");
  });

  it("fetches standard answers with authorization", async () => {
    const mockAnswers = {
      fullName: "Jane Doe",
      email: "jane@example.com",
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      expect(url).toBe("https://applydesk.example.com/api/ext/answers");
      return new Response(JSON.stringify({ answers: mockAnswers }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createApplyDeskClient({ baseUrl, token, fetch: mockFetch });
    const answers = await client.getStandardAnswers();

    expect(answers).toEqual(mockAnswers);
  });

  it("saves a job with JSON payload", async () => {
    let capturedBody = "";
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://applydesk.example.com/api/ext/jobs");
      expect(init?.method).toBe("POST");
      capturedBody = init?.body as string;
      return new Response(
        JSON.stringify({
          job: { id: "job_1", company: "Acme", title: "Engineer", status: "analyzing" },
          duplicate: false,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    });

    const client = createApplyDeskClient({ baseUrl, token, fetch: mockFetch });
    const response = await client.saveJob({
      company: "Acme",
      title: "Engineer",
      url: "https://jobs.example.com/123",
      description: "Build things",
    });

    expect(response.duplicate).toBe(false);
    expect(response.job.id).toBe("job_1");
    expect(JSON.parse(capturedBody)).toEqual({
      company: "Acme",
      title: "Engineer",
      url: "https://jobs.example.com/123",
      description: "Build things",
    });
  });

  it("queries approved jobs with query params", async () => {
    let capturedUrl = "";
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({
          jobs: [{ id: "job_1", company: "Stripe", title: "Staff Engineer", status: "approved" }],
          suggestedJobId: "job_1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const client = createApplyDeskClient({ baseUrl, token, fetch: mockFetch });
    const res = await client.getApprovedJobs({
      company: "Stripe",
      url: "https://stripe.com/jobs/123",
    });

    expect(capturedUrl).toContain("status=approved");
    expect(capturedUrl).toContain("company=Stripe");
    expect(res.jobs).toHaveLength(1);
    expect(res.suggestedJobId).toBe("job_1");
  });

  it("fetches PDF blob", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      expect(url).toBe("https://applydesk.example.com/api/ext/jobs/job_1/files/resume");
      return new Response(new Blob(["%PDF-1.4..."], { type: "application/pdf" }), {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      });
    });

    const client = createApplyDeskClient({ baseUrl, token, fetch: mockFetch });
    const blob = await client.getJobPdf("job_1", "resume");

    expect(blob).toBeInstanceOf(Blob);
  });

  it("marks a job as applied", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://applydesk.example.com/api/ext/jobs/job_1/applied");
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createApplyDeskClient({ baseUrl, token, fetch: mockFetch });
    const res = await client.markApplied("job_1");

    expect(res.ok).toBe(true);
  });

  it("throws ApplyDeskApiError on error responses", async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({ error: { message: "Not found", code: "not_found" } }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    });

    const client = createApplyDeskClient({ baseUrl, token, fetch: mockFetch });

    await expect(client.markApplied("unknown_job")).rejects.toThrow(ApplyDeskApiError);
  });
});

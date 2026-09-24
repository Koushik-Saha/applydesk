import { NextResponse } from "next/server";
import { extensionJobInputSchema, jobStatusSchema } from "@applydesk/shared";
import { withExtensionToken } from "@/lib/http/with-extension-token";
import { jsonError } from "@/lib/http/api-error";
import { createExtensionJob, listJobs, setJobStatus, InvalidJobUrlError } from "@/lib/jobs/service";
import { enqueueTask } from "@/lib/tasks/enqueue";

// PROJECT_SPEC.md §8:
// POST /api/ext/jobs — save job from page -> creates + analyzes
export async function POST(request: Request) {
  return withExtensionToken(request, async ({ ownerId }) => {
    const body = await request.json();
    const input = extensionJobInputSchema.parse(body);

    let job, duplicate;
    try {
      ({ job, duplicate } = await createExtensionJob(ownerId, input));
    } catch (error) {
      if (error instanceof InvalidJobUrlError) {
        return jsonError("invalid_url", error.message, 400);
      }
      throw error;
    }
    if (duplicate) {
      return NextResponse.json({ job, duplicate: true });
    }

    const task = await enqueueTask("job_analyze", { jobId: job.id }, job.id);
    await setJobStatus(job.id, "analyzing");

    return NextResponse.json(
      { job: { ...job, status: "analyzing" }, duplicate: false, taskId: task.id },
      { status: 201 },
    );
  });
}

// GET /api/ext/jobs — list jobs for Apply dropdown, optionally suggest match
export async function GET(request: Request) {
  return withExtensionToken(request, async ({ ownerId }) => {
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const status = statusRaw ? jobStatusSchema.parse(statusRaw) : "approved";
    const targetUrl = searchParams.get("url")?.toLowerCase();
    const targetCompany = searchParams.get("company")?.toLowerCase();

    const jobs = await listJobs(ownerId, { status });

    let suggestedJobId: string | null = null;
    if (targetCompany || targetUrl) {
      // Find best match by company or URL substring
      const matched = jobs.find((j) => {
        const jComp = j.company.toLowerCase();
        if (targetCompany && (jComp.includes(targetCompany) || targetCompany.includes(jComp))) {
          return true;
        }
        if (targetUrl && j.url) {
          try {
            const host = new URL(j.url).hostname.replace(/^www\./, "");
            const currentHost = new URL(targetUrl).hostname.replace(/^www\./, "");
            if (host === currentHost) return true;
          } catch {
            // ignore URL parse errors
          }
        }
        return false;
      });
      if (matched) {
        suggestedJobId = matched.id;
      }
    }

    return NextResponse.json({ jobs, suggestedJobId });
  });
}

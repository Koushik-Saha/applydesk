import { NextResponse } from "next/server";
import { manualJobInputSchema, jobStatusSchema } from "@applydesk/shared";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { createManualJob, listJobs, setJobStatus, InvalidJobUrlError } from "@/lib/jobs/service";
import { enqueueTask } from "@/lib/tasks/enqueue";

export async function GET(request: Request) {
  return withOwner(async (ownerId) => {
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const status = statusRaw ? jobStatusSchema.parse(statusRaw) : undefined;
    const q = searchParams.get("q") ?? undefined;
    const sortRaw = searchParams.get("sort");
    const sort = sortRaw === "score" || sortRaw === "company" || sortRaw === "date" ? sortRaw : undefined;

    const jobs = await listJobs(ownerId, { status, q, sort });
    return NextResponse.json({ jobs });
  });
}

// PROJECT_SPEC.md's daily flow — saving a job immediately kicks off analysis
// (§4.3), not just a separate manual "analyze" step.
export async function POST(request: Request) {
  return withOwner(async (ownerId) => {
    const body = await request.json();
    const input = manualJobInputSchema.parse(body);

    let job, duplicate;
    try {
      ({ job, duplicate } = await createManualJob(ownerId, input));
    } catch (error) {
      if (error instanceof InvalidJobUrlError) {
        return jsonError("invalid_url", error.message, 400);
      }
      throw error;
    }
    if (duplicate) return NextResponse.json({ job, duplicate: true });

    await enqueueTask("job_analyze", { jobId: job.id }, job.id);
    await setJobStatus(job.id, "analyzing");

    return NextResponse.json({ job: { ...job, status: "analyzing" }, duplicate: false }, { status: 201 });
  });
}

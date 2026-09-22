import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getJob, getLatestAnalysis } from "@/lib/jobs/service";
import { getLatestTaskForJob } from "@/lib/tasks/get-task";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const job = await getJob(ownerId, id);
    if (!job) return jsonError("not_found", `No such job: ${id}`, 404);

    const [analysis, analyzeTask] = await Promise.all([
      getLatestAnalysis(job.id),
      getLatestTaskForJob(job.id, "job_analyze"),
    ]);
    return NextResponse.json({ job, analysis, analyzeTask });
  });
}

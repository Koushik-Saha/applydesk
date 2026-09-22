import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getJob, setJobStatus } from "@/lib/jobs/service";
import { enqueueTask } from "@/lib/tasks/enqueue";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const job = await getJob(ownerId, id);
    if (!job) return jsonError("not_found", `No such job: ${id}`, 404);

    await enqueueTask("job_analyze", { jobId: job.id }, job.id);
    await setJobStatus(job.id, "analyzing");

    return NextResponse.json({ ok: true });
  });
}

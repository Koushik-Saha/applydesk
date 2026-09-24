import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getJob, setJobStatus, recordJobEvent } from "@/lib/jobs/service";
import { unapproveJobDocuments } from "@/lib/documents/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const job = await getJob(ownerId, id);
    if (!job) return jsonError("not_found", `Job not found: ${id}`, 404);

    await unapproveJobDocuments(job.id);
    await setJobStatus(job.id, "draft");
    await recordJobEvent(job.id, "documents_unapproved", { jobId: job.id });

    return NextResponse.json({ ok: true });
  });
}

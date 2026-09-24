import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getJob } from "@/lib/jobs/service";
import { enqueueTask } from "@/lib/tasks/enqueue";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Google Drive is a bonus backup copy, not a requirement — the
// document_approve task itself skips the Drive upload gracefully when Drive
// isn't connected, so this route doesn't gate on it either.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const rateCheck = checkRateLimit(`approve_${ownerId}`, { maxRequests: 20, windowMs: 60000 });
    if (!rateCheck.success) {
      return jsonError("rate_limited", "Approval rate limit reached. Please wait a moment.", 429);
    }

    const { id } = await params;
    const job = await getJob(ownerId, id);
    if (!job) return jsonError("not_found", `Job not found: ${id}`, 404);

    const task = await enqueueTask("document_approve", { jobId: job.id }, job.id);
    return NextResponse.json({ ok: true, taskId: task.id }, { status: 202 });
  });
}

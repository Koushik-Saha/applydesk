import { NextResponse } from "next/server";
import { z } from "zod";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getJob, getLatestAnalysis, setJobStatus } from "@/lib/jobs/service";
import { enqueueTask } from "@/lib/tasks/enqueue";
import { checkRateLimit } from "@/lib/security/rate-limit";

const generateInputSchema = z.object({
  kinds: z.array(z.enum(["resume", "cover_letter"])).min(1),
  whyCompanyNote: z.string().optional(),
});

// PROJECT_SPEC.md §9, §10 — POST /api/jobs/:id/generate { kinds, whyCompanyNote? } -> task.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const rateCheck = checkRateLimit(`ai_${ownerId}`, { maxRequests: 20, windowMs: 60000 });
    if (!rateCheck.success) {
      return jsonError("rate_limited", "AI generation rate limit reached. Please wait a moment.", 429);
    }

    const { id } = await params;
    const job = await getJob(ownerId, id);
    if (!job) return jsonError("not_found", `No such job: ${id}`, 404);

    const body = generateInputSchema.parse(await request.json());

    const analysis = await getLatestAnalysis(job.id);
    if (!analysis) return jsonError("not_analyzed", "Analyze this job before generating documents.", 400);

    await enqueueTask("job_generate", { jobId: job.id, kinds: body.kinds, whyCompanyNote: body.whyCompanyNote }, job.id);
    await setJobStatus(job.id, "generating");

    return NextResponse.json({ ok: true });
  });
}

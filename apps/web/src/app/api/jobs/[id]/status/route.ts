import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { db } from "@/lib/db/client";
import { jobs, type JobStatus } from "@/lib/db/schema";
import { getJob, recordJobEvent } from "@/lib/jobs/service";

const statusSchema = z.object({
  status: z.enum([
    "new",
    "analyzing",
    "scored",
    "generating",
    "draft",
    "approved",
    "applied",
    "interviewing",
    "offer",
    "rejected",
    "skipped",
    "withdrawn",
    "error",
  ]),
});

// PROJECT_SPEC.md §9 — POST /api/jobs/:id/status { status }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const job = await getJob(ownerId, id);
    if (!job) return jsonError("not_found", `Job not found: ${id}`, 404);

    const body = statusSchema.parse(await request.json());
    const newStatus = body.status as JobStatus;
    const oldStatus = job.status;

    const shouldSetAppliedAt = newStatus === "applied" && !job.appliedAt;

    await db
      .update(jobs)
      .set({
        status: newStatus,
        statusChangedAt: new Date(),
        ...(shouldSetAppliedAt ? { appliedAt: new Date() } : {}),
      })
      .where(eq(jobs.id, job.id));

    await recordJobEvent(job.id, "status_changed", {
      from: oldStatus,
      to: newStatus,
    });

    return NextResponse.json({ ok: true, status: newStatus });
  });
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withExtensionToken } from "@/lib/http/with-extension-token";
import { jsonError } from "@/lib/http/api-error";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { getJob, recordJobEvent } from "@/lib/jobs/service";

// PROJECT_SPEC.md §8 — POST /api/ext/jobs/:id/applied (marks job as applied)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withExtensionToken(request, async ({ ownerId }) => {
    const { id } = await params;

    const job = await getJob(ownerId, id);
    if (!job) {
      return jsonError("not_found", `Job not found: ${id}`, 404);
    }

    const oldStatus = job.status;
    const now = new Date();

    await db
      .update(jobs)
      .set({
        status: "applied",
        statusChangedAt: now,
        appliedAt: job.appliedAt ?? now,
      })
      .where(eq(jobs.id, job.id));

    await recordJobEvent(job.id, "status_changed", {
      from: oldStatus,
      to: "applied",
      source: "extension",
    });

    return NextResponse.json({ ok: true, status: "applied" });
  });
}

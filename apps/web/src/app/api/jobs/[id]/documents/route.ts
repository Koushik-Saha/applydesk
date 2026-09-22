import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getJob } from "@/lib/jobs/service";
import { listDocuments } from "@/lib/documents/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const job = await getJob(ownerId, id);
    if (!job) return jsonError("not_found", `No such job: ${id}`, 404);

    const documents = await listDocuments(job.id);
    return NextResponse.json({ documents });
  });
}

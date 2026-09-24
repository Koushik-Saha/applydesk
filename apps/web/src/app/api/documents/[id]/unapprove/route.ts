import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getDocumentForOwner, unapproveJobDocuments } from "@/lib/documents/service";
import { setJobStatus, recordJobEvent } from "@/lib/jobs/service";

// PROJECT_SPEC.md §9 — POST /api/documents/:id/unapprove
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;

    const document = await getDocumentForOwner(ownerId, id);
    if (!document) {
      return jsonError("not_found", "Document not found", 404);
    }

    await unapproveJobDocuments(document.jobId);
    await setJobStatus(document.jobId, "draft");
    await recordJobEvent(document.jobId, "documents_unapproved", { documentId: id });

    return NextResponse.json({ ok: true });
  });
}

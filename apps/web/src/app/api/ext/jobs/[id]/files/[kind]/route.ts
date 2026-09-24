import { NextResponse } from "next/server";
import { withExtensionToken } from "@/lib/http/with-extension-token";
import { jsonError } from "@/lib/http/api-error";
import { getJob } from "@/lib/jobs/service";
import { getDocumentByJobAndKind } from "@/lib/documents/service";
import { getActiveProfile } from "@/lib/profile/service";
import { resumeContentSchema, coverLetterContentSchema } from "@applydesk/shared";
import { renderResumePdf, renderCoverLetterPdf } from "@/lib/pdf/render";
import { resumeFileName, coverLetterFileName } from "@/lib/documents/filenames";

// PROJECT_SPEC.md §8 — GET /api/ext/jobs/:id/files/:kind (PDF bytes for resume | cover_letter)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  return withExtensionToken(request, async ({ ownerId }) => {
    const { id, kind } = await params;

    if (kind !== "resume" && kind !== "cover_letter") {
      return jsonError("bad_request", "Invalid file kind. Expected resume or cover_letter.", 400);
    }

    const job = await getJob(ownerId, id);
    if (!job) {
      return jsonError("not_found", `Job not found: ${id}`, 404);
    }

    const document = await getDocumentByJobAndKind(job.id, kind);
    if (!document) {
      return jsonError(
        "not_found",
        `No document found for job ${id} of kind ${kind}.`,
        404,
      );
    }

    let buffer: Buffer;
    let fileName: string;

    if (kind === "resume") {
      const content = resumeContentSchema.parse(document.content);
      buffer = await renderResumePdf(content);
      fileName = resumeFileName(content.contactFullName || "Resume", job.company);
    } else {
      const content = coverLetterContentSchema.parse(document.content);
      const active = await getActiveProfile(ownerId);
      const candidate = {
        fullName: active?.profile.contact.fullName ?? "Candidate",
        email: active?.profile.contact.email,
        phone: active?.profile.contact.phone,
        location: active?.profile.contact.location,
        linkedin: active?.profile.contact.linkedin,
        github: active?.profile.contact.github,
        portfolio: active?.profile.contact.portfolio,
      };
      const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
        document.createdAt ?? new Date(),
      );
      buffer = await renderCoverLetterPdf(content, {
        candidate,
        company: job.company,
        date,
      });
      fileName = coverLetterFileName(candidate.fullName, job.company);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  });
}

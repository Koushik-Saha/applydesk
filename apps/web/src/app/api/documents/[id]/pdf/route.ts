import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { getDocumentForOwner } from "@/lib/documents/service";
import { getJob } from "@/lib/jobs/service";
import { getActiveProfile } from "@/lib/profile/service";
import { resumeContentSchema, coverLetterContentSchema } from "@applydesk/shared";
import { renderResumePdf, renderCoverLetterPdf } from "@/lib/pdf/render";
import { resumeFileName, coverLetterFileName } from "@/lib/documents/filenames";

// PROJECT_SPEC.md §9 — GET /api/documents/:id/pdf "preview/download (streams)"
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;

    const document = await getDocumentForOwner(ownerId, id);
    if (!document) {
      return jsonError("not_found", "Document not found", 404);
    }

    const job = await getJob(ownerId, document.jobId);
    if (!job) {
      return jsonError("not_found", "Job associated with document not found", 404);
    }

    let buffer: Buffer;
    let fileName: string;

    if (document.kind === "resume") {
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

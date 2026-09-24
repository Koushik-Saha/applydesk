"use client";

import { useState } from "react";
import { ExternalLink, Download, FileText, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ResumeVersion } from "./resume-editor";
import type { CoverLetterVersion } from "./cover-letter-editor";

interface PdfPreviewTabProps {
  resumeVersions: ResumeVersion[];
  coverLetterVersions: CoverLetterVersion[];
  jobCompany: string;
}

export function PdfPreviewTab({
  resumeVersions,
  coverLetterVersions,
  jobCompany,
}: PdfPreviewTabProps) {
  const hasResume = resumeVersions.length > 0;
  const hasCoverLetter = coverLetterVersions.length > 0;

  const [selectedKind, setSelectedKind] = useState<"resume" | "cover_letter">(
    hasResume ? "resume" : "cover_letter",
  );

  if (!hasResume && !hasCoverLetter) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
        <FileText className="size-10 text-text-muted mb-3" />
        <h3 className="text-base font-medium text-text">No documents generated yet</h3>
        <p className="text-sm text-text-muted mt-1 max-w-sm">
          Click &ldquo;Generate&rdquo; in the analysis panel to create tailored documents for {jobCompany}.
        </p>
      </div>
    );
  }

  const currentDoc =
    selectedKind === "resume" ? resumeVersions[0] : coverLetterVersions[0];

  const pdfUrl = currentDoc ? `/api/documents/${currentDoc.id}/pdf` : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          {hasResume && (
            <Button
              size="sm"
              variant={selectedKind === "resume" ? "default" : "outline"}
              onClick={() => setSelectedKind("resume")}
            >
              Resume (v{resumeVersions[0]?.version})
            </Button>
          )}
          {hasCoverLetter && (
            <Button
              size="sm"
              variant={selectedKind === "cover_letter" ? "default" : "outline"}
              onClick={() => setSelectedKind("cover_letter")}
            >
              Cover Letter (v{coverLetterVersions[0]?.version})
            </Button>
          )}

          {currentDoc?.status === "approved" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" /> Approved
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-stone-500/10 px-2 py-0.5 text-xs font-medium text-text-muted">
              Draft
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentDoc?.driveWebViewLink && (
            <a
              href={currentDoc.driveWebViewLink}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Drive <ExternalLink className="size-3.5" />
            </a>
          )}
          {pdfUrl && (
            <>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open tab <ExternalLink className="size-3.5" />
              </a>
              <a
                href={pdfUrl}
                download
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Download className="size-3.5" /> Download
              </a>
            </>
          )}
        </div>
      </div>

      {pdfUrl ? (
        <div className="w-full rounded-xl border border-border bg-white shadow-xs overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-[850px] border-0"
            title="Document PDF Preview"
          />
        </div>
      ) : (
        <p className="text-sm text-text-muted">Select a document to preview.</p>
      )}
    </div>
  );
}

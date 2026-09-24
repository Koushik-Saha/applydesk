import { renderToBuffer, Font } from "@react-pdf/renderer";
import { getDocumentProxy } from "unpdf";
import type { CoverLetterContent, ResumeContent } from "@applydesk/shared";
import { ResumePdf, COMPACTION_TIERS } from "./resume-pdf";
import { CoverLetterPdf, type CoverLetterCandidateInfo } from "./cover-letter-pdf";

// react-pdf's default hyphenation (@react-pdf/hyphenate) has a known class
// of bugs that produce corrupted/garbled/overlapping text output — and in
// this project specifically, its locale module fails to resolve cleanly
// under Next.js's bundler. A no-op callback disables hyphenation entirely,
// which also just reads better on a resume (no mid-word line breaks).
// Font's registry is a process-wide singleton, so this only needs to run
// once; registerHyphenationCallback is idempotent to call again.
Font.registerHyphenationCallback((word) => [word]);

async function pageCount(buffer: Buffer): Promise<number> {
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  return doc.numPages;
}

// A resume should fit one page (§11 doesn't set a page-count rule, but a
// tailored, curated selection of content is expected to). Render at the
// roomiest tier first and only step down to tighter (still fully legible)
// tiers if the selected content doesn't fit — never touches the content
// itself, only spacing/font-size.
export async function renderResumePdf(content: ResumeContent): Promise<Buffer> {
  let last: Buffer | null = null;
  for (const compaction of COMPACTION_TIERS) {
    const buffer = await renderToBuffer(ResumePdf({ content, compaction }));
    last = buffer;
    if ((await pageCount(buffer)) <= 1) return buffer;
  }
  // Exhausted every tier — return the most compact attempt rather than
  // fail; a resume with genuinely more content than fits even at the
  // tightest legible tier still needs to be usable.
  return last!;
}

export function renderCoverLetterPdf(
  content: CoverLetterContent,
  meta: { candidate: CoverLetterCandidateInfo; company: string; date: string },
): Promise<Buffer> {
  return renderToBuffer(CoverLetterPdf({ content, ...meta }));
}

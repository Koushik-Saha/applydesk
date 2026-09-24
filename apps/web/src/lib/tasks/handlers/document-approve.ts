import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { resumeContentSchema, coverLetterContentSchema } from "@applydesk/shared";
import { getActiveProfile } from "@/lib/profile/service";
import { recordJobEvent } from "@/lib/jobs/service";
import {
  getLatestDocumentByKind,
  getLastDriveFileId,
  markDocumentApproved,
} from "@/lib/documents/service";
import { renderResumePdf, renderCoverLetterPdf } from "@/lib/pdf/render";
import { resumeFileName, coverLetterFileName } from "@/lib/documents/filenames";
import { getConnection, ensureJobFolder, uploadOrReplaceFile } from "@/lib/google/service";
import { registerTaskHandler } from "../registry";

interface DocumentApprovePayload {
  jobId: string;
}

registerTaskHandler("document_approve", async (rawPayload, { setStep }) => {
  const { jobId } = rawPayload as DocumentApprovePayload;

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error(`Job not found: ${jobId}`);

  // Google Drive is a bonus backup copy, not a requirement — the extension
  // and the site's own PDF preview both render straight from `documents`,
  // never from Drive. Approving without Drive connected just skips the
  // upload; connecting Drive later and re-approving will sync it then.
  await setStep("validate");
  const connection = await getConnection(job.ownerId);

  const [resumeDoc, coverLetterDoc] = await Promise.all([
    getLatestDocumentByKind(job.id, "resume"),
    getLatestDocumentByKind(job.id, "cover_letter"),
  ]);

  if (!resumeDoc && !coverLetterDoc) {
    throw new Error("No documents found for this job to approve.");
  }

  await setStep("render");
  const activeProfile = await getActiveProfile(job.ownerId);

  let resumeBuffer: Buffer | null = null;
  let resumeName: string | null = null;
  if (resumeDoc) {
    const resumeContent = resumeContentSchema.parse(resumeDoc.content);
    resumeBuffer = await renderResumePdf(resumeContent);
    resumeName = resumeFileName(resumeContent.contactFullName, job.company);
  }

  let coverLetterBuffer: Buffer | null = null;
  let coverLetterName: string | null = null;
  if (coverLetterDoc) {
    const coverContent = coverLetterContentSchema.parse(coverLetterDoc.content);
    const candidate = {
      fullName:
        activeProfile?.profile.contact.fullName ??
        (resumeDoc ? resumeContentSchema.parse(resumeDoc.content).contactFullName : "Candidate"),
      email: activeProfile?.profile.contact.email,
      phone: activeProfile?.profile.contact.phone,
      location: activeProfile?.profile.contact.location,
      linkedin: activeProfile?.profile.contact.linkedin,
      github: activeProfile?.profile.contact.github,
      portfolio: activeProfile?.profile.contact.portfolio,
    };
    const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date());
    coverLetterBuffer = await renderCoverLetterPdf(coverContent, {
      candidate,
      company: job.company,
      date,
    });
    coverLetterName = coverLetterFileName(candidate.fullName, job.company);
  }

  let folderLink: string | null = null;
  let uploadedResumeFileId: string | null = null;
  let uploadedCoverLetterFileId: string | null = null;

  if (connection) {
    await setStep("drive");
    const folder = await ensureJobFolder(job.ownerId, job.id, job.company, job.title);
    folderLink = folder.folderLink;

    if (resumeDoc && resumeBuffer && resumeName) {
      const existingResumeFileId = await getLastDriveFileId(job.id, "resume");
      const uploaded = await uploadOrReplaceFile(
        job.ownerId,
        folder.folderId,
        resumeName,
        resumeBuffer,
        existingResumeFileId,
      );
      uploadedResumeFileId = uploaded.fileId;
      await markDocumentApproved(resumeDoc.id, {
        driveFileId: uploaded.fileId,
        driveWebViewLink: uploaded.webViewLink,
        fileName: resumeName,
      });
    }

    if (coverLetterDoc && coverLetterBuffer && coverLetterName) {
      const existingCoverFileId = await getLastDriveFileId(job.id, "cover_letter");
      const uploaded = await uploadOrReplaceFile(
        job.ownerId,
        folder.folderId,
        coverLetterName,
        coverLetterBuffer,
        existingCoverFileId,
      );
      uploadedCoverLetterFileId = uploaded.fileId;
      await markDocumentApproved(coverLetterDoc.id, {
        driveFileId: uploaded.fileId,
        driveWebViewLink: uploaded.webViewLink,
        fileName: coverLetterName,
      });
    }
  } else {
    // No Drive connection — still approve using the rendered PDFs' names,
    // just without a Drive copy. markDocumentApproved leaves driveFileId /
    // driveWebViewLink null, which the UI already renders around.
    if (resumeDoc && resumeName) {
      await markDocumentApproved(resumeDoc.id, { fileName: resumeName });
    }
    if (coverLetterDoc && coverLetterName) {
      await markDocumentApproved(coverLetterDoc.id, { fileName: coverLetterName });
    }
  }

  await setStep("finalize");
  await db
    .update(jobs)
    .set({ status: "approved", statusChangedAt: new Date() })
    .where(eq(jobs.id, job.id));

  await recordJobEvent(job.id, "document_approved", {
    resumeFileId: uploadedResumeFileId,
    coverLetterFileId: uploadedCoverLetterFileId,
    driveFolderLink: folderLink,
    driveSynced: connection !== null,
  });

  return {
    jobId: job.id,
    folderLink,
    resumeFileId: uploadedResumeFileId,
    coverLetterFileId: uploadedCoverLetterFileId,
    driveSynced: connection !== null,
  };
});

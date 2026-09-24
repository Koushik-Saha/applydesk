import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, jobs, type DocumentKind } from "@/lib/db/schema";

export async function createDocumentVersion(params: {
  jobId: string;
  kind: DocumentKind;
  content: unknown;
  lint: unknown;
  validation: unknown;
  postScore?: number;
  profileVersionId: string;
  promptVersion: string;
}) {
  const [latest] = await db
    .select({ version: documents.version })
    .from(documents)
    .where(and(eq(documents.jobId, params.jobId), eq(documents.kind, params.kind)))
    .orderBy(desc(documents.version))
    .limit(1);

  const version = (latest?.version ?? 0) + 1;

  const [row] = await db
    .insert(documents)
    .values({
      jobId: params.jobId,
      kind: params.kind,
      version,
      content: params.content,
      lint: params.lint,
      validation: params.validation,
      postScore: params.postScore,
      status: "draft",
      profileVersionId: params.profileVersionId,
      promptVersion: params.promptVersion,
    })
    .returning();
  return row!;
}

// PROJECT_SPEC.md §4.7 — "every save creates a version." Returned newest
// version first per kind, for the editor's version selector.
export async function listDocuments(jobId: string) {
  return db
    .select()
    .from(documents)
    .where(eq(documents.jobId, jobId))
    .orderBy(desc(documents.kind), desc(documents.version));
}

export async function getLatestDocumentByKind(jobId: string, kind: DocumentKind) {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.jobId, jobId), eq(documents.kind, kind)))
    .orderBy(desc(documents.version))
    .limit(1);
  return row ?? null;
}

export async function getDocumentByJobAndKind(jobId: string, kind: DocumentKind) {
  const [approved] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.jobId, jobId), eq(documents.kind, kind), eq(documents.status, "approved")))
    .orderBy(desc(documents.version))
    .limit(1);

  if (approved) return approved;
  return getLatestDocumentByKind(jobId, kind);
}

// A fresh draft version's own driveFileId is null (only an approved
// version ever gets one set) — re-approving needs the most recent
// non-null id for this job+kind so Drive replaces the existing file
// in place instead of creating a duplicate (§4.7 "replaced on re-approve").
export async function getLastDriveFileId(jobId: string, kind: DocumentKind): Promise<string | null> {
  const [row] = await db
    .select({ driveFileId: documents.driveFileId })
    .from(documents)
    .where(and(eq(documents.jobId, jobId), eq(documents.kind, kind), isNotNull(documents.driveFileId)))
    .orderBy(desc(documents.version))
    .limit(1);
  return row?.driveFileId ?? null;
}

export async function markDocumentApproved(
  documentId: string,
  params: { driveFileId?: string; driveWebViewLink?: string; fileName: string },
): Promise<void> {
  await db
    .update(documents)
    .set({
      status: "approved",
      driveFileId: params.driveFileId ?? null,
      driveWebViewLink: params.driveWebViewLink ?? null,
      fileName: params.fileName,
      approvedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
}

export async function getDocumentForOwner(ownerId: string, documentId: string) {
  const [row] = await db
    .select({ document: documents, ownerId: jobs.ownerId })
    .from(documents)
    .innerJoin(jobs, eq(documents.jobId, jobs.id))
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!row || row.ownerId !== ownerId) return null;
  return row.document;
}

export class DocumentNotFoundError extends Error {}

// Manual edits from the editor create a new version too, carrying forward
// the lint/validation results from generation — this is the owner's own
// content now, not model output, so it isn't re-validated.
export async function saveDocumentEdit(ownerId: string, documentId: string, content: unknown) {
  const existing = await getDocumentForOwner(ownerId, documentId);
  if (!existing) throw new DocumentNotFoundError(`No such document: ${documentId}`);

  return createDocumentVersion({
    jobId: existing.jobId,
    kind: existing.kind,
    content,
    lint: existing.lint,
    validation: existing.validation,
    postScore: existing.postScore ?? undefined,
    profileVersionId: existing.profileVersionId,
    promptVersion: existing.promptVersion,
  });
}

// PROJECT_SPEC.md §4.7 — "Unapprove allowed (creates a new draft version;
// Drive files are replaced on re-approve)." Job status is one field for
// the whole job, so approve/unapprove act on every kind that job has
// together, not one document at a time.
export async function unapproveJobDocuments(jobId: string): Promise<void> {
  for (const kind of ["resume", "cover_letter"] as const) {
    const latest = await getLatestDocumentByKind(jobId, kind);
    if (!latest || latest.status !== "approved") continue;

    await createDocumentVersion({
      jobId: latest.jobId,
      kind: latest.kind,
      content: latest.content,
      lint: latest.lint,
      validation: latest.validation,
      postScore: latest.postScore ?? undefined,
      profileVersionId: latest.profileVersionId,
      promptVersion: latest.promptVersion,
    });
  }
}

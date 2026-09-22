import { and, desc, eq } from "drizzle-orm";
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

import { createHash } from "node:crypto";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { ManualJobInput, ExtensionJobInput } from "@applydesk/shared";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobEvents, jobs, type JobStatus } from "@/lib/db/schema";
import { validateSafeUrl } from "@/lib/security/ssrf";

function hash(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

export class InvalidJobUrlError extends Error {}

// A job's URL is rendered as an outbound link on the job page (job-detail.tsx),
// so a manual paste or a compromised page's extraction result could smuggle a
// `javascript:`/`data:` URI or point at an internal address. Reuses the same
// scheme/private-network guard PROJECT_SPEC.md §10 asks for on server-side
// URL fetches, applied here at the one place a URL enters storage.
function assertSafeJobUrl(url: string): void {
  const result = validateSafeUrl(url);
  if (!result.valid) {
    throw new InvalidJobUrlError(`Unsafe job URL: ${result.reason ?? "rejected"}`);
  }
}

export async function recordJobEvent(jobId: string, type: string, meta?: unknown): Promise<void> {
  await db.insert(jobEvents).values({ jobId, type, meta: meta ?? null });
}

// PROJECT_SPEC.md §4.2, §5.1 — Save job from extension
export async function createExtensionJob(ownerId: string, input: ExtensionJobInput) {
  assertSafeJobUrl(input.url);
  const urlHash = hash(input.url);
  const descriptionHash = hash(input.description);

  const [existing] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.ownerId, ownerId),
        or(eq(jobs.urlHash, urlHash), eq(jobs.descriptionHash, descriptionHash)),
      ),
    )
    .limit(1);

  if (existing) return { job: existing, duplicate: true as const };

  const [job] = await db
    .insert(jobs)
    .values({
      ownerId,
      source: "extension",
      url: input.url,
      urlHash,
      company: input.company,
      title: input.title,
      location: input.location,
      remoteType: input.remoteType,
      atsType: input.atsType,
      rawDescription: input.description,
      descriptionHash,
      status: "new",
    })
    .returning();

  await recordJobEvent(job!.id, "created", { source: "extension" });

  return { job: job!, duplicate: false as const };
}

// PROJECT_SPEC.md §4.2 — "Duplicate check: same URL or same description hash
// -> show the existing job instead of creating a new one."
export async function createManualJob(ownerId: string, input: ManualJobInput) {
  assertSafeJobUrl(input.url);
  const urlHash = hash(input.url);
  const descriptionHash = hash(input.description);

  const [existing] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.ownerId, ownerId),
        or(eq(jobs.urlHash, urlHash), eq(jobs.descriptionHash, descriptionHash)),
      ),
    )
    .limit(1);

  if (existing) return { job: existing, duplicate: true as const };

  const [job] = await db
    .insert(jobs)
    .values({
      ownerId,
      source: "manual",
      url: input.url,
      urlHash,
      company: input.company,
      title: input.title,
      location: input.location,
      remoteType: input.remoteType,
      rawDescription: input.description,
      descriptionHash,
      status: "new",
    })
    .returning();

  await recordJobEvent(job!.id, "created", { source: "manual" });

  return { job: job!, duplicate: false as const };
}

export interface ListJobsParams {
  status?: JobStatus;
  q?: string;
  sort?: "score" | "date" | "company";
}

export async function listJobs(ownerId: string, params: ListJobsParams) {
  const conditions = [eq(jobs.ownerId, ownerId)];
  if (params.status) conditions.push(eq(jobs.status, params.status));
  if (params.q) {
    const term = `%${params.q}%`;
    conditions.push(or(ilike(jobs.title, term), ilike(jobs.company, term))!);
  }

  const orderBy =
    params.sort === "score"
      ? desc(jobs.score)
      : params.sort === "company"
        ? jobs.company
        : desc(jobs.createdAt);

  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(orderBy);
}

export async function getJob(ownerId: string, id: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.ownerId, ownerId)))
    .limit(1);
  return job ?? null;
}

export async function getLatestAnalysis(jobId: string) {
  const [analysis] = await db
    .select()
    .from(jobAnalyses)
    .where(eq(jobAnalyses.jobId, jobId))
    .orderBy(desc(jobAnalyses.createdAt))
    .limit(1);
  return analysis ?? null;
}

export async function listJobEvents(jobId: string) {
  return db.select().from(jobEvents).where(eq(jobEvents.jobId, jobId)).orderBy(desc(jobEvents.at));
}

export async function setJobStatus(jobId: string, status: JobStatus): Promise<void> {
  await db.update(jobs).set({ status, statusChangedAt: new Date() }).where(eq(jobs.id, jobId));
}

export class JobNotFoundError extends Error {}

export async function skipJob(ownerId: string, id: string): Promise<void> {
  const job = await getJob(ownerId, id);
  if (!job) throw new JobNotFoundError(`No such job: ${id}`);
  await setJobStatus(id, "skipped");
  await recordJobEvent(id, "skipped");
}

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";
import { PROMPT_VERSION } from "@/lib/ai/prompts/job-analyze";
import { getActiveProfile } from "@/lib/profile/service";
import { getStandardAnswers } from "@/lib/profile/standard-answers-service";
import { analyzeJobDescription } from "@/lib/jobs/analyze";
import { recordJobEvent } from "@/lib/jobs/service";
import { registerTaskHandler } from "../registry";

interface JobAnalyzePayload {
  jobId: string;
}

registerTaskHandler("job_analyze", async (rawPayload, { setStep }) => {
  const { jobId } = rawPayload as JobAnalyzePayload;
  let previousStatus: string | undefined;

  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) throw new Error(`No such job: ${jobId}`);
    previousStatus = job.status;

    const active = await getActiveProfile(job.ownerId);
    if (!active) throw new Error("No master profile saved yet — import or build one first.");

    const standardAnswers = await getStandardAnswers(job.ownerId);

    const result = await analyzeJobDescription({
      rawDescription: job.rawDescription,
      profile: active.profile,
      standardAnswers,
      jobId,
      onStep: setStep,
    });

    await db.insert(jobAnalyses).values({
      jobId,
      requirements: result.requirements,
      evidence: result.evidence,
      score: result.score,
      band: result.band,
      // keywordsFound/Missing persisted here (not just returned) so a page
      // load days later can still render the keyword chips/highlighting
      // without recomputing against a profile that may have since changed.
      breakdown: { keywordsFound: result.keywordsFound, keywordsMissing: result.keywordsMissing },
      flags: result.flags,
      profileVersionId: active.versionId,
      promptVersion: PROMPT_VERSION,
    });

    await db
      .update(jobs)
      .set({ status: "scored", score: result.score, band: result.band, statusChangedAt: new Date() })
      .where(eq(jobs.id, jobId));
    await recordJobEvent(jobId, "status_changed", {
      from: previousStatus,
      to: "scored",
      score: result.score,
      band: result.band,
    });

    return { score: result.score, band: result.band, keywordsFound: result.keywordsFound, keywordsMissing: result.keywordsMissing };
  } catch (error) {
    if (previousStatus !== undefined) {
      await db
        .update(jobs)
        .set({ status: "error", statusChangedAt: new Date() })
        .where(eq(jobs.id, jobId));
      await recordJobEvent(jobId, "status_changed", {
        from: previousStatus,
        to: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
});

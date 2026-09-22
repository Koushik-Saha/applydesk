import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { evidenceItemSchema, requirementsSchema } from "@/lib/ai/prompts/job-analyze";
import { PROMPT_VERSION } from "@/lib/ai/prompts/job-generate";
import { getActiveProfile } from "@/lib/profile/service";
import { listVoiceSamples } from "@/lib/profile/voice-samples-service";
import { getSettings } from "@/lib/settings/service";
import { getLatestAnalysis, recordJobEvent } from "@/lib/jobs/service";
import { generateJobDocuments, type DocumentKind } from "@/lib/generation/generate";
import { createDocumentVersion } from "@/lib/documents/service";
import { registerTaskHandler } from "../registry";

interface JobGeneratePayload {
  jobId: string;
  kinds: DocumentKind[];
  whyCompanyNote?: string;
}

const WRITE_MODEL = () => process.env.AI_MODEL_WRITE || "claude-sonnet-5";

const evidenceListSchema = z.array(evidenceItemSchema);
const breakdownSchema = z.object({ keywordsFound: z.array(z.string()).default([]) });

registerTaskHandler("job_generate", async (rawPayload, { setStep }) => {
  const { jobId, kinds, whyCompanyNote } = rawPayload as JobGeneratePayload;

  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) throw new Error(`No such job: ${jobId}`);

    const active = await getActiveProfile(job.ownerId);
    if (!active) throw new Error("No master profile saved yet — import or build one first.");

    const analysis = await getLatestAnalysis(jobId);
    if (!analysis) throw new Error("Analyze this job before generating documents.");

    const requirements = requirementsSchema.parse(analysis.requirements);
    const evidence = evidenceListSchema.parse(analysis.evidence);
    const breakdown = breakdownSchema.parse(analysis.breakdown);

    const [voiceSamples, settingsData] = await Promise.all([
      listVoiceSamples(job.ownerId),
      getSettings(job.ownerId),
    ]);

    const result = await generateJobDocuments({
      profile: active.profile,
      requirements,
      evidence,
      keywordsFoundBefore: breakdown.keywordsFound.length,
      voiceSamples: voiceSamples.map((v) => v.text),
      bannedPhrases: settingsData.bannedPhrases,
      kinds,
      company: job.company,
      jobTitle: job.title,
      whyCompanyNote,
      writeModel: WRITE_MODEL(),
      jobId,
      onStep: setStep,
    });

    if (result.resume) {
      await createDocumentVersion({
        jobId,
        kind: "resume",
        content: result.resume.content,
        lint: result.resume.lint,
        validation: result.resume.validation,
        postScore: result.resume.content.keywordCoverage.after,
        profileVersionId: active.versionId,
        promptVersion: PROMPT_VERSION,
      });
    }

    if (result.coverLetter) {
      await createDocumentVersion({
        jobId,
        kind: "cover_letter",
        content: result.coverLetter.content,
        lint: result.coverLetter.lint,
        validation: result.coverLetter.validation,
        profileVersionId: active.versionId,
        promptVersion: PROMPT_VERSION,
      });
    }

    await db.update(jobs).set({ status: "draft", statusChangedAt: new Date() }).where(eq(jobs.id, jobId));
    await recordJobEvent(jobId, "documents_generated", { kinds });

    return { kinds };
  } catch (error) {
    await db.update(jobs).set({ status: "error", statusChangedAt: new Date() }).where(eq(jobs.id, jobId));
    throw error;
  }
});

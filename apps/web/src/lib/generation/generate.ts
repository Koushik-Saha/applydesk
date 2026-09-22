import type {
  CoverLetterContent,
  DocumentLint,
  DocumentValidation,
  MasterProfile,
  ResumeContent,
} from "@applydesk/shared";
import type { EvidenceItem, Requirements } from "@/lib/ai/prompts/job-analyze";
import { selectForResume } from "./select";
import { runRewrite, type RewriteBulletOutput } from "./rewrite";
import { runHumanizeCoverLetter, runHumanizeResume } from "./humanize";
import { runCoverLetterDraft } from "./cover-letter";
import { assembleResumeContent } from "./assemble";
import { lintResumeBullets } from "./lint";

export type DocumentKind = "resume" | "cover_letter";

export interface GenerateJobDocumentsParams {
  profile: MasterProfile;
  requirements: Requirements;
  evidence: EvidenceItem[];
  keywordsFoundBefore: number;
  voiceSamples: string[];
  bannedPhrases: string[];
  kinds: DocumentKind[];
  company?: string;
  jobTitle?: string;
  whyCompanyNote?: string;
  writeModel: string;
  jobId?: string;
  onStep?: (step: string) => void | Promise<void>;
}

export interface GeneratedDocument<T> {
  content: T;
  validation: DocumentValidation;
  lint: DocumentLint;
}

export interface GenerateJobDocumentsResult {
  resume?: GeneratedDocument<ResumeContent>;
  coverLetter?: GeneratedDocument<CoverLetterContent>;
}

// The one place both the "job_generate" task handler and `pnpm eval` call
// into — same reasoning as lib/jobs/analyze.ts for job_analyze: eval must
// exercise the exact production pipeline, not a parallel reimplementation.
export async function generateJobDocuments(params: GenerateJobDocumentsParams): Promise<GenerateJobDocumentsResult> {
  const {
    profile,
    requirements,
    evidence,
    keywordsFoundBefore,
    voiceSamples,
    bannedPhrases,
    kinds,
    company,
    jobTitle,
    whyCompanyNote,
    writeModel,
    jobId,
    onStep,
  } = params;

  await onStep?.("select");
  const selected = selectForResume(profile, evidence);
  const result: GenerateJobDocumentsResult = {};

  if (kinds.includes("resume")) {
    await onStep?.("resume");
    const rewriteOutcome = await runRewrite({ profile, requirements, selected, model: writeModel, jobId });
    const humanizeOutcome = await runHumanizeResume({
      summary: rewriteOutcome.summary,
      bullets: rewriteOutcome.bullets.map((b) => b.text),
      voiceSamples,
      bannedPhrases,
      model: writeModel,
      jobId,
    });

    const humanizedTexts = rewriteOutcome.bullets.map((bullet, i) => humanizeOutcome.bullets[i] ?? bullet.text);
    // lint the final text once more here (not just inside the humanize
    // retry loop) so each bullet can carry its own warnings directly —
    // the editor then never has to re-match a flat index back to a row.
    const finalLint = lintResumeBullets(humanizedTexts, bannedPhrases);
    const documentLevelWarnings = finalLint.filter((w) => w.bulletIndex === undefined);

    const finalBullets: RewriteBulletOutput[] = rewriteOutcome.bullets.map((bullet, i) => ({
      ...bullet,
      text: humanizedTexts[i]!,
      lintWarnings: finalLint.filter((w) => w.bulletIndex === i).map((w) => w.message),
    }));

    const content = assembleResumeContent({
      profile,
      selected,
      summary: humanizeOutcome.summary,
      bullets: finalBullets,
      skills: rewriteOutcome.skills,
      keywords: requirements.keywords,
      keywordsFoundBefore,
    });

    const fallbackBulletIndexes = finalBullets
      .map((bullet, i) => (bullet.originalKept ? i : -1))
      .filter((i) => i >= 0);

    result.resume = {
      content,
      validation: { violations: rewriteOutcome.initialViolations, fallbackBulletIndexes },
      lint: { warnings: documentLevelWarnings },
    };
  }

  if (kinds.includes("cover_letter")) {
    await onStep?.("cover_letter");
    const availableBullets = selected.experiences
      .filter((e) => !e.summarized)
      .flatMap((e) => e.bullets.map((b) => ({ id: b.bulletId, text: b.text })));

    const draft = await runCoverLetterDraft({
      requirements,
      company: company ?? "",
      jobTitle: jobTitle ?? "",
      candidateName: profile.contact.fullName,
      candidateSummary: profile.summary,
      availableBullets,
      whyCompanyNote,
      model: writeModel,
      jobId,
    });

    const humanized = await runHumanizeCoverLetter({
      paragraphs: draft.paragraphs,
      voiceSamples,
      bannedPhrases,
      model: writeModel,
      jobId,
    });

    const content: CoverLetterContent = {
      greeting: draft.greeting,
      paragraphs: humanized.paragraphs,
      signOff: draft.signOff,
      referencedBulletIds: draft.referencedBulletIds,
      originalKept: draft.originalKept,
    };

    result.coverLetter = {
      content,
      validation: { violations: draft.initialViolations, fallbackBulletIndexes: [] },
      lint: { warnings: humanized.warnings },
    };
  }

  await onStep?.("save");
  return result;
}

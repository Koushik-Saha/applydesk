import { computeScore, matchKeywords, type MasterProfile, type StandardAnswers } from "@applydesk/shared";
import { generateStructured } from "@/lib/ai/client";
import {
  EXTRACT_REQUIREMENTS_SYSTEM_PROMPT,
  evidenceResultSchema,
  FIND_EVIDENCE_SYSTEM_PROMPT,
  requirementsSchema,
  type EvidenceItem,
  type Requirements,
} from "@/lib/ai/prompts/job-analyze";
import { computeJobFlags, type JobFlags } from "./flags";
import { verifyEvidence } from "./evidence";

const EXTRACT_MODEL = () => process.env.AI_MODEL_EXTRACT || "claude-haiku-4-5-20251001";

export interface AnalyzeJobDescriptionParams {
  rawDescription: string;
  profile: MasterProfile;
  standardAnswers: StandardAnswers;
  jobId?: string;
  onStep?: (step: "extract_requirements" | "find_evidence" | "score") => void | Promise<void>;
}

export interface AnalyzeJobDescriptionResult {
  requirements: Requirements;
  evidence: EvidenceItem[];
  score: number;
  band: string;
  keywordsFound: string[];
  keywordsMissing: string[];
  flags: JobFlags;
}

// The one place both the "job_analyze" task handler and `pnpm eval` call
// into — keeps eval a real test of the exact production pipeline (as
// CLAUDE.md's eval harness intends), not a parallel reimplementation that
// could quietly drift from it.
export async function analyzeJobDescription({
  rawDescription,
  profile,
  standardAnswers,
  jobId,
  onStep,
}: AnalyzeJobDescriptionParams): Promise<AnalyzeJobDescriptionResult> {
  await onStep?.("extract_requirements");
  const { data: requirements } = await generateStructured({
    step: "extract_requirements",
    model: EXTRACT_MODEL(),
    system: EXTRACT_REQUIREMENTS_SYSTEM_PROMPT,
    input: rawDescription,
    schema: requirementsSchema,
    jobId,
  });

  await onStep?.("find_evidence");
  const bullets = [
    ...profile.experiences.flatMap((e) => e.bullets),
    ...profile.projects.flatMap((p) => p.bullets),
  ].map((b) => ({ id: b.id, text: b.text }));

  const allRequirements = [
    ...requirements.mustHave.map((r) => ({ requirement: r, type: "must" as const })),
    ...requirements.niceToHave.map((r) => ({ requirement: r, type: "nice" as const })),
  ];

  let evidence: EvidenceItem[];
  if (allRequirements.length > 0 && bullets.length > 0) {
    const { data } = await generateStructured({
      step: "find_evidence",
      model: EXTRACT_MODEL(),
      system: FIND_EVIDENCE_SYSTEM_PROMPT,
      input: JSON.stringify({ requirements: allRequirements, bullets }),
      schema: evidenceResultSchema,
      jobId,
    });
    const validIds = new Set(bullets.map((b) => b.id));
    evidence = verifyEvidence(data.items, validIds);
  } else {
    evidence = allRequirements.map((r) => ({
      requirement: r.requirement,
      type: r.type,
      status: "missing",
      evidenceBulletIds: [],
      reason: bullets.length === 0 ? "No profile bullets to check against." : "No requirements extracted.",
    }));
  }

  await onStep?.("score");
  const mustHaveStatuses = evidence.filter((i) => i.type === "must").map((i) => i.status);
  const niceToHaveStatuses = evidence.filter((i) => i.type === "nice").map((i) => i.status);
  const { found, missing } = matchKeywords(requirements.keywords, profile);
  const breakdown = computeScore({
    mustHaveStatuses,
    niceToHaveStatuses,
    keywordsFound: found.length,
    keywordsTotal: requirements.keywords.length,
  });

  const flags = computeJobFlags({
    requirements,
    candidateYears: standardAnswers.yearsOfExperience,
    candidateLocation: profile.contact.location || standardAnswers.cityState,
    willingToRelocate: standardAnswers.willingToRelocate,
  });

  return {
    requirements,
    evidence,
    score: breakdown.score,
    band: breakdown.band,
    keywordsFound: found,
    keywordsMissing: missing,
    flags,
  };
}

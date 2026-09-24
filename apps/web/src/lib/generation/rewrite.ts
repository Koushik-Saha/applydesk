import type { MasterProfile, Violation } from "@applydesk/shared";
import { generateStructured } from "@/lib/ai/client";
import { REWRITE_RESUME_SYSTEM_PROMPT, rewriteResultSchema, type RewriteResult } from "@/lib/ai/prompts/job-generate";
import type { Requirements } from "@/lib/ai/prompts/job-analyze";
import type { SelectedContent } from "./select";
import { validateResumeBullets, validateSkills } from "./validate";

export interface RewriteBulletOutput {
  sourceBulletIds: string[];
  text: string;
  originalKept: boolean;
  lintWarnings?: string[];
}

export interface RewriteOutcome {
  summary: string;
  bullets: RewriteBulletOutput[];
  skills: string[];
  retried: boolean;
  initialViolations: Violation[];
}

export function buildSourceBulletMap(selected: SelectedContent): Map<string, string> {
  const map = new Map<string, string>();
  for (const exp of selected.experiences) for (const bullet of exp.bullets) map.set(bullet.bulletId, bullet.text);
  return map;
}

// Only the profile's own canonical, categorized skill list — not each
// bullet's free-text skill tags, which are topic tags for evidence-matching
// (e.g. "multi-tenant platform"), not real tool/technology names, and would
// otherwise leak into the resume's Skills section.
export function collectAvailableSkills(profile: MasterProfile): string[] {
  return profile.skills.map((skill) => skill.name);
}

function buildRewriteInput(params: {
  requirements: Requirements;
  summary: string;
  availableSkills: string[];
  selected: SelectedContent;
}): string {
  return JSON.stringify({
    requirements: {
      mustHave: params.requirements.mustHave,
      niceToHave: params.requirements.niceToHave,
      keywords: params.requirements.keywords,
      seniority: params.requirements.seniority,
    },
    candidateSummary: params.summary,
    availableSkills: params.availableSkills,
    experiences: params.selected.experiences
      .filter((e) => !e.summarized)
      .map((e) => ({
        company: e.company,
        title: e.title,
        bullets: e.bullets.map((b) => ({ id: b.bulletId, text: b.text })),
      })),
  });
}

async function callRewrite(input: string, model: string, jobId?: string): Promise<RewriteResult> {
  const { data } = await generateStructured({
    step: "rewrite_resume",
    model,
    system: REWRITE_RESUME_SYSTEM_PROMPT,
    input,
    schema: rewriteResultSchema,
    jobId,
  });
  return data;
}

// PROJECT_SPEC.md §4.4 steps 2-3 — rewrite, validate, one retry with the
// violations listed, then fall back to original bullet text for whatever
// still fails.
export async function runRewrite(params: {
  profile: MasterProfile;
  requirements: Requirements;
  selected: SelectedContent;
  model: string;
  jobId?: string;
}): Promise<RewriteOutcome> {
  const { profile, requirements, selected, model, jobId } = params;
  const sourceBulletsById = buildSourceBulletMap(selected);
  const availableSkills = collectAvailableSkills(profile);
  const input = buildRewriteInput({ requirements, summary: profile.summary, availableSkills, selected });

  let result = await callRewrite(input, model, jobId);
  let { violations: bulletViolations, invalidBulletIndexes } = validateResumeBullets(result.bullets, sourceBulletsById);
  let { violations: skillViolations, invalidSkills } = validateSkills(result.skills, profile);
  let violations = [...bulletViolations, ...skillViolations];
  const initialViolations = violations;
  let retried = false;

  if (violations.length > 0) {
    retried = true;
    const retryInput = `${input}\n\nYour previous response had these problems. Regenerate a corrected, complete response that fixes them:\n${violations.map((v) => `- ${v.message}`).join("\n")}`;
    result = await callRewrite(retryInput, model, jobId);
    ({ violations: bulletViolations, invalidBulletIndexes } = validateResumeBullets(result.bullets, sourceBulletsById));
    ({ violations: skillViolations, invalidSkills } = validateSkills(result.skills, profile));
    violations = [...bulletViolations, ...skillViolations];
  }

  const invalidSet = new Set(invalidBulletIndexes);
  const bullets: RewriteBulletOutput[] = [];
  result.bullets.forEach((bullet, index) => {
    if (!invalidSet.has(index)) {
      bullets.push({ sourceBulletIds: bullet.sourceBulletIds, text: bullet.text, originalKept: false });
      return;
    }
    // fall back to the original text of the first still-valid cited source;
    // if none of its ids are real, the bullet can't be recovered and is dropped.
    const validId = bullet.sourceBulletIds.find((id) => sourceBulletsById.has(id));
    if (!validId) return;
    bullets.push({ sourceBulletIds: [validId], text: sourceBulletsById.get(validId)!, originalKept: true });
  });

  const invalidSkillSet = new Set(invalidSkills);
  const skills = result.skills.filter((skill) => !invalidSkillSet.has(skill));

  return { summary: result.summary, bullets, skills, retried, initialViolations };
}

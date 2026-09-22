import { matchKeywordsInText, type MasterProfile, type ResumeContent, type ResumeExperience } from "@applydesk/shared";
import type { RewriteBulletOutput } from "./rewrite";
import type { SelectedContent } from "./select";

// PROJECT_SPEC.md §4.4 step 5 — "Assemble the resume document in code
// (names, titles, dates, education from profile)." Contact info, company
// names, titles, dates, and education are copied verbatim from the
// profile here — never written by the model (CLAUDE.md rule 2).
export function assembleResumeContent(params: {
  profile: MasterProfile;
  selected: SelectedContent;
  summary: string;
  bullets: RewriteBulletOutput[];
  skills: string[];
  keywords: string[];
  keywordsFoundBefore: number;
}): ResumeContent {
  const { profile, selected, summary, bullets, skills, keywords, keywordsFoundBefore } = params;

  const bulletToExperience = new Map<string, string>();
  for (const exp of profile.experiences) for (const bullet of exp.bullets) bulletToExperience.set(bullet.id, exp.id);

  const bulletsByExperience = new Map<string, ResumeExperience["bullets"]>();
  for (const bullet of bullets) {
    const firstSourceId = bullet.sourceBulletIds[0];
    const experienceId = firstSourceId ? bulletToExperience.get(firstSourceId) : undefined;
    if (!experienceId) continue;
    const list = bulletsByExperience.get(experienceId) ?? [];
    list.push({
      sourceBulletIds: bullet.sourceBulletIds,
      text: bullet.text,
      originalKept: bullet.originalKept,
      lintWarnings: bullet.lintWarnings ?? [],
    });
    bulletsByExperience.set(experienceId, list);
  }

  const summarizedIds = new Set(selected.experiences.filter((e) => e.summarized).map((e) => e.id));

  const experiences: ResumeExperience[] = profile.experiences.map((exp) => {
    const summarized = summarizedIds.has(exp.id);
    return {
      id: exp.id,
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      current: exp.current,
      bullets: summarized ? [] : (bulletsByExperience.get(exp.id) ?? []),
      summarized,
    };
  });

  const education = profile.education.map((e) => ({
    id: e.id,
    school: e.school,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    startDate: e.startDate,
    endDate: e.endDate,
  }));

  const resumeText = [summary, ...bullets.map((b) => b.text), ...skills].join("\n");
  const skillTerms = new Set(skills.map((s) => s.trim().toLowerCase()));
  const { found, missing } = matchKeywordsInText(keywords, resumeText, skillTerms);
  const after = keywords.length === 0 ? 100 : Math.round((found.length / keywords.length) * 100);
  const before = keywords.length === 0 ? 100 : Math.round((keywordsFoundBefore / keywords.length) * 100);

  return {
    contactFullName: profile.contact.fullName,
    contactEmail: profile.contact.email,
    contactPhone: profile.contact.phone,
    contactLocation: profile.contact.location,
    contactLinkedin: profile.contact.linkedin,
    contactGithub: profile.contact.github,
    contactPortfolio: profile.contact.portfolio,
    summary,
    experiences,
    education,
    skills,
    keywordCoverage: { before, after, foundAfter: found, missingAfter: missing },
  };
}

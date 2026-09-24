import {
  matchKeywordsInText,
  type MasterProfile,
  type ResumeContent,
  type ResumeExperience,
  type ResumeSkillGroup,
} from "@applydesk/shared";
import type { RewriteBulletOutput } from "./rewrite";
import type { SelectedContent } from "./select";

// Groups the AI-selected, relevance-ordered skill list back into the
// profile's own categories (e.g. "Frontend", "Cloud & DevOps") — preserves
// which skills were chosen and their order, just restores the structure a
// flat comma list loses. A skill with no category (or not found in the
// profile at all) falls into "Other".
function groupSkillsByCategory(skills: string[], profile: MasterProfile): ResumeSkillGroup[] {
  const categoryByName = new Map<string, string>();
  for (const skill of profile.skills) {
    categoryByName.set(skill.name.trim().toLowerCase(), skill.category?.trim() || "Other");
  }

  const groups: ResumeSkillGroup[] = [];
  const indexByCategory = new Map<string, number>();
  for (const name of skills) {
    const category = categoryByName.get(name.trim().toLowerCase()) ?? "Other";
    let index = indexByCategory.get(category);
    if (index === undefined) {
      index = groups.length;
      indexByCategory.set(category, index);
      groups.push({ category, skills: [] });
    }
    groups[index]!.skills.push(name);
  }
  return groups;
}

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

  // Projects, certifications, and publications aren't part of the AI
  // pipeline at all (no tailoring step touches them) — copied straight from
  // the profile, same as education above, so they never silently disappear.
  const projects = profile.projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || p.bullets.map((b) => b.text).join(" "),
    url: p.url,
    startDate: p.startDate,
    endDate: p.endDate,
  }));

  const certifications = profile.certifications.map((c) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuer,
    date: c.date,
  }));

  const publications = profile.publications.map((p) => ({
    id: p.id,
    title: p.title,
    publisher: p.publisher,
    date: p.date,
  }));

  const skillGroups = groupSkillsByCategory(skills, profile);

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
    projects,
    education,
    certifications,
    publications,
    skills,
    skillGroups,
    keywordCoverage: { before, after, foundAfter: found, missingAfter: missing },
  };
}

import type { Bullet, Experience, MasterProfile } from "@applydesk/shared";
import type { EvidenceItem } from "@/lib/ai/prompts/job-analyze";

export interface RankedBullet {
  bulletId: string;
  text: string;
  score: number;
}

export interface SelectedExperience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  bullets: RankedBullet[];
  summarized: boolean;
}

export interface SelectedContent {
  experiences: SelectedExperience[];
}

// PROJECT_SPEC.md §4.4 step 1 — "all recent roles; older ones summarized."
export const RECENT_EXPERIENCE_COUNT = 3;
export const MAX_BULLETS_PER_EXPERIENCE = 4;

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// Profile dates come from resume text as-written (see profile-import's
// prompt), so this only needs to order experiences relative to each other
// — not parse exactly. Unparseable text sorts oldest rather than throwing.
export function parseApproxDate(value: string | undefined): number {
  if (!value) return 0;
  const trimmed = value.trim().toLowerCase();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) return Number(isoMatch[1]) * 12 + Number(isoMatch[2]);

  const monthYearMatch = trimmed.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (monthYearMatch?.[1] && monthYearMatch[2]) {
    const month = MONTHS[monthYearMatch[1].slice(0, 3)];
    if (month) return Number(monthYearMatch[2]) * 12 + month;
  }

  const yearOnlyMatch = trimmed.match(/^(\d{4})$/);
  if (yearOnlyMatch) return Number(yearOnlyMatch[1]) * 12;

  return 0;
}

function experienceRecencyKey(exp: Experience): number {
  if (exp.current || !exp.endDate) return Infinity;
  return parseApproxDate(exp.endDate);
}

// Weight: must-have requirements outweigh nice-to-have; a fully "met"
// requirement outweighs a merely "partial" one. Bullets cited by no
// requirement score 0 (still eligible, just ranked last).
export function rankBulletRelevance(bullets: Bullet[], evidence: EvidenceItem[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const bullet of bullets) scores.set(bullet.id, 0);

  for (const item of evidence) {
    if (item.status === "missing") continue;
    const weight = (item.type === "must" ? 2 : 1) * (item.status === "met" ? 1 : 0.5);
    for (const id of item.evidenceBulletIds) {
      if (!scores.has(id)) continue;
      scores.set(id, (scores.get(id) ?? 0) + weight);
    }
  }

  return scores;
}

function rankAndCapBullets(bullets: Bullet[], scores: Map<string, number>): RankedBullet[] {
  return bullets
    .map((b) => ({ bulletId: b.id, text: b.text, score: scores.get(b.id) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_BULLETS_PER_EXPERIENCE);
}

// PROJECT_SPEC.md §4.4 step 1 — select which experiences to include and
// rank their bullets by evidence relevance to this job.
export function selectForResume(profile: MasterProfile, evidence: EvidenceItem[]): SelectedContent {
  const allBullets = [...profile.experiences.flatMap((e) => e.bullets), ...profile.projects.flatMap((p) => p.bullets)];
  const scores = rankBulletRelevance(allBullets, evidence);

  const ordered = [...profile.experiences].sort((a, b) => experienceRecencyKey(b) - experienceRecencyKey(a));
  const recentIds = new Set(ordered.slice(0, RECENT_EXPERIENCE_COUNT).map((e) => e.id));

  const experiences: SelectedExperience[] = profile.experiences.map((exp) => {
    const summarized = !recentIds.has(exp.id);
    return {
      id: exp.id,
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      current: exp.current,
      bullets: summarized ? [] : rankAndCapBullets(exp.bullets, scores),
      summarized,
    };
  });

  return { experiences };
}

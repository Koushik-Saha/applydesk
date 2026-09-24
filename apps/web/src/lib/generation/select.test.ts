import { describe, expect, it } from "vitest";
import { emptyMasterProfile, type MasterProfile } from "@applydesk/shared";
import type { EvidenceItem } from "@/lib/ai/prompts/job-analyze";
import {
  MAX_BULLETS_PER_EXPERIENCE,
  parseApproxDate,
  rankBulletRelevance,
  selectForResume,
} from "./select";

function bullet(id: string, text = id) {
  return { id, text, skills: [], metrics: [], tags: [] };
}

function experience(id: string, opts: Partial<{ endDate: string; current: boolean; bulletIds: string[] }> = {}) {
  return {
    id,
    company: `Company ${id}`,
    title: `Title ${id}`,
    startDate: "2020-01",
    endDate: opts.endDate,
    current: opts.current ?? false,
    bullets: (opts.bulletIds ?? [`${id}-b1`]).map((bid) => bullet(bid)),
  };
}

describe("parseApproxDate", () => {
  it("parses ISO year-month", () => {
    expect(parseApproxDate("2022-06")).toBe(2022 * 12 + 6);
  });

  it("parses 'Month YYYY'", () => {
    expect(parseApproxDate("March 2021")).toBe(2021 * 12 + 3);
  });

  it("parses abbreviated month", () => {
    expect(parseApproxDate("Mar. 2021")).toBe(2021 * 12 + 3);
  });

  it("parses a bare year", () => {
    expect(parseApproxDate("2019")).toBe(2019 * 12);
  });

  it("falls back to 0 for unparseable text", () => {
    expect(parseApproxDate("sometime last year")).toBe(0);
  });

  it("falls back to 0 for undefined", () => {
    expect(parseApproxDate(undefined)).toBe(0);
  });
});

describe("rankBulletRelevance", () => {
  it("weights must-have over nice-to-have", () => {
    const bullets = [bullet("b1"), bullet("b2")];
    const evidence: EvidenceItem[] = [
      { requirement: "r1", type: "must", status: "met", evidenceBulletIds: ["b1"], reason: "" },
      { requirement: "r2", type: "nice", status: "met", evidenceBulletIds: ["b2"], reason: "" },
    ];
    const scores = rankBulletRelevance(bullets, evidence);
    expect(scores.get("b1")!).toBeGreaterThan(scores.get("b2")!);
  });

  it("weights met over partial", () => {
    const bullets = [bullet("b1"), bullet("b2")];
    const evidence: EvidenceItem[] = [
      { requirement: "r1", type: "must", status: "met", evidenceBulletIds: ["b1"], reason: "" },
      { requirement: "r2", type: "must", status: "partial", evidenceBulletIds: ["b2"], reason: "" },
    ];
    const scores = rankBulletRelevance(bullets, evidence);
    expect(scores.get("b1")!).toBeGreaterThan(scores.get("b2")!);
  });

  it("ignores missing-status evidence entirely", () => {
    const bullets = [bullet("b1")];
    const evidence: EvidenceItem[] = [
      { requirement: "r1", type: "must", status: "missing", evidenceBulletIds: ["b1"], reason: "" },
    ];
    const scores = rankBulletRelevance(bullets, evidence);
    expect(scores.get("b1")).toBe(0);
  });

  it("accumulates score across multiple citing requirements", () => {
    const bullets = [bullet("b1")];
    const evidence: EvidenceItem[] = [
      { requirement: "r1", type: "must", status: "met", evidenceBulletIds: ["b1"], reason: "" },
      { requirement: "r2", type: "nice", status: "met", evidenceBulletIds: ["b1"], reason: "" },
    ];
    const scores = rankBulletRelevance(bullets, evidence);
    expect(scores.get("b1")).toBe(3);
  });

  it("ignores evidence ids that aren't in the given bullet list", () => {
    const bullets = [bullet("b1")];
    const evidence: EvidenceItem[] = [
      { requirement: "r1", type: "must", status: "met", evidenceBulletIds: ["ghost"], reason: "" },
    ];
    const scores = rankBulletRelevance(bullets, evidence);
    expect(scores.get("b1")).toBe(0);
    expect(scores.has("ghost")).toBe(false);
  });

  it("scores an uncited bullet as 0, not missing from the map", () => {
    const bullets = [bullet("b1")];
    const scores = rankBulletRelevance(bullets, []);
    expect(scores.get("b1")).toBe(0);
  });
});

describe("selectForResume", () => {
  function profileWithExperiences(experiences: MasterProfile["experiences"]): MasterProfile {
    return { ...emptyMasterProfile(), experiences };
  }

  it("marks the most recent experiences (current + latest end dates) as not summarized", () => {
    // RECENT_EXPERIENCE_COUNT is 5, so this needs 6 roles to exercise
    // summarization at all — a 5-role career (a common full resume) should
    // get bullets on every role, matching a real resume's style.
    const profile = profileWithExperiences([
      experience("oldest", { endDate: "2012-01" }),
      experience("old", { endDate: "2015-01" }),
      experience("mid", { endDate: "2019-01" }),
      experience("recent", { endDate: "2022-01" }),
      experience("recent2", { endDate: "2023-01" }),
      experience("current", { current: true }),
    ]);

    const result = selectForResume(profile, []);
    const summarizedIds = result.experiences.filter((e) => e.summarized).map((e) => e.id);
    const fullIds = result.experiences.filter((e) => !e.summarized).map((e) => e.id);

    expect(summarizedIds).toEqual(["oldest"]);
    expect(fullIds.sort()).toEqual(["current", "mid", "old", "recent", "recent2"].sort());
  });

  it("gives a summarized experience no bullets", () => {
    const profile = profileWithExperiences([
      experience("oldest", { endDate: "2008-01" }),
      experience("old", { endDate: "2010-01" }),
      experience("a", { endDate: "2018-01" }),
      experience("b", { endDate: "2020-01" }),
      experience("c", { endDate: "2021-01" }),
      experience("d", { current: true }),
    ]);
    const result = selectForResume(profile, []);
    const old = result.experiences.find((e) => e.id === "oldest")!;
    expect(old.summarized).toBe(true);
    expect(old.bullets).toEqual([]);
  });

  it("caps bullets per included experience and orders them by score descending", () => {
    const bulletIds = ["b1", "b2", "b3", "b4", "b5"];
    const profile = profileWithExperiences([experience("current", { current: true, bulletIds })]);
    const evidence: EvidenceItem[] = [
      { requirement: "r1", type: "must", status: "met", evidenceBulletIds: ["b3"], reason: "" },
      { requirement: "r2", type: "must", status: "met", evidenceBulletIds: ["b3"], reason: "" },
      { requirement: "r3", type: "must", status: "met", evidenceBulletIds: ["b1"], reason: "" },
    ];

    const result = selectForResume(profile, evidence);
    const exp = result.experiences[0]!;
    expect(exp.bullets.length).toBe(MAX_BULLETS_PER_EXPERIENCE);
    expect(exp.bullets[0]?.bulletId).toBe("b3");
    expect(exp.bullets[1]?.bulletId).toBe("b1");
  });

  it("returns an empty experiences list for an empty profile", () => {
    const result = selectForResume(emptyMasterProfile(), []);
    expect(result.experiences).toEqual([]);
  });
});

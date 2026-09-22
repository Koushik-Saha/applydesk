import { describe, expect, it } from "vitest";
import { emptyMasterProfile, type MasterProfile } from "@applydesk/shared";
import { assembleResumeContent } from "./assemble";
import type { SelectedContent } from "./select";

function profileWithOneExperience(): MasterProfile {
  return {
    ...emptyMasterProfile(),
    contact: { fullName: "Koushik Saha", email: "k@example.com" },
    experiences: [
      {
        id: "e1",
        company: "Acme",
        title: "Engineer",
        startDate: "2020-01",
        current: true,
        bullets: [
          { id: "b1", text: "Cut load time 40%", skills: [], metrics: [], tags: [] },
          { id: "b2", text: "Led onboarding revamp", skills: [], metrics: [], tags: [] },
        ],
      },
      {
        id: "e2",
        company: "OldCo",
        title: "Junior Engineer",
        startDate: "2015-01",
        endDate: "2018-01",
        current: false,
        bullets: [{ id: "b3", text: "Wrote internal tools", skills: [], metrics: [], tags: [] }],
      },
    ],
    education: [{ id: "ed1", school: "State U", degree: "BS Computer Science" }],
  };
}

function selected(summarizedIds: string[] = ["e2"]): SelectedContent {
  return {
    experiences: [
      { id: "e1", company: "Acme", title: "Engineer", startDate: "2020-01", current: true, bullets: [], summarized: summarizedIds.includes("e1") },
      { id: "e2", company: "OldCo", title: "Junior Engineer", startDate: "2015-01", endDate: "2018-01", current: false, bullets: [], summarized: summarizedIds.includes("e2") },
    ],
  };
}

describe("assembleResumeContent", () => {
  it("copies contact info verbatim from the profile", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "Backend engineer.",
      bullets: [],
      skills: [],
      keywords: [],
      keywordsFoundBefore: 0,
    });
    expect(result.contactFullName).toBe("Koushik Saha");
    expect(result.contactEmail).toBe("k@example.com");
  });

  it("copies company/title/dates from the profile, not from generated content", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "s",
      bullets: [],
      skills: [],
      keywords: [],
      keywordsFoundBefore: 0,
    });
    const acme = result.experiences.find((e) => e.id === "e1")!;
    expect(acme.company).toBe("Acme");
    expect(acme.title).toBe("Engineer");
    expect(acme.startDate).toBe("2020-01");
    expect(acme.current).toBe(true);
  });

  it("groups rewritten bullets under the experience their source bullet belongs to", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "s",
      bullets: [
        { sourceBulletIds: ["b1"], text: "Cut load time 40%", originalKept: false },
        { sourceBulletIds: ["b2"], text: "Led onboarding revamp", originalKept: false },
      ],
      skills: [],
      keywords: [],
      keywordsFoundBefore: 0,
    });
    const acme = result.experiences.find((e) => e.id === "e1")!;
    expect(acme.bullets).toHaveLength(2);
    expect(acme.bullets.map((b) => b.text)).toEqual(["Cut load time 40%", "Led onboarding revamp"]);
  });

  it("marks a summarized experience with no bullets even if one somehow slipped through", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(["e2"]),
      summary: "s",
      bullets: [{ sourceBulletIds: ["b3"], text: "Wrote internal tools", originalKept: false }],
      skills: [],
      keywords: [],
      keywordsFoundBefore: 0,
    });
    const oldCo = result.experiences.find((e) => e.id === "e2")!;
    expect(oldCo.summarized).toBe(true);
    expect(oldCo.bullets).toEqual([]);
  });

  it("drops a bullet whose source id doesn't map to any known experience", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "s",
      bullets: [{ sourceBulletIds: ["ghost"], text: "Made something up", originalKept: false }],
      skills: [],
      keywords: [],
      keywordsFoundBefore: 0,
    });
    expect(result.experiences.flatMap((e) => e.bullets)).toEqual([]);
  });

  it("copies education verbatim from the profile", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "s",
      bullets: [],
      skills: [],
      keywords: [],
      keywordsFoundBefore: 0,
    });
    expect(result.education).toEqual([
      { id: "ed1", school: "State U", degree: "BS Computer Science", fieldOfStudy: undefined, startDate: undefined, endDate: undefined },
    ]);
  });

  it("computes post-score keyword coverage from the assembled resume text", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "Backend engineer skilled in distributed systems.",
      bullets: [{ sourceBulletIds: ["b1"], text: "Cut load time using Kafka", originalKept: false }],
      skills: ["TypeScript"],
      keywords: ["Kafka", "TypeScript", "Rust"],
      keywordsFoundBefore: 1,
    });
    expect(result.keywordCoverage.foundAfter.sort()).toEqual(["Kafka", "TypeScript"].sort());
    expect(result.keywordCoverage.missingAfter).toEqual(["Rust"]);
    expect(result.keywordCoverage.after).toBe(Math.round((2 / 3) * 100));
    expect(result.keywordCoverage.before).toBe(Math.round((1 / 3) * 100));
  });

  it("scores 100% coverage when there are no keywords to match", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "s",
      bullets: [],
      skills: [],
      keywords: [],
      keywordsFoundBefore: 0,
    });
    expect(result.keywordCoverage.before).toBe(100);
    expect(result.keywordCoverage.after).toBe(100);
  });

  it("matches a keyword via the tailored skills list even if absent from bullet text", () => {
    const result = assembleResumeContent({
      profile: profileWithOneExperience(),
      selected: selected(),
      summary: "s",
      bullets: [],
      skills: ["Kubernetes"],
      keywords: ["Kubernetes"],
      keywordsFoundBefore: 0,
    });
    expect(result.keywordCoverage.foundAfter).toEqual(["Kubernetes"]);
  });
});

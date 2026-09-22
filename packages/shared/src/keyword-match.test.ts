import { describe, expect, it } from "vitest";
import { emptyMasterProfile } from "./schemas/master-profile";
import { matchKeywords } from "./keyword-match";

function profileWith(overrides: Partial<ReturnType<typeof emptyMasterProfile>>) {
  return { ...emptyMasterProfile(), ...overrides };
}

describe("matchKeywords", () => {
  it("finds a keyword tagged as a skill", () => {
    const profile = profileWith({ skills: [{ id: "s1", name: "TypeScript" }] });
    const { found, missing } = matchKeywords(["TypeScript"], profile);
    expect(found).toEqual(["TypeScript"]);
    expect(missing).toEqual([]);
  });

  it("is case-insensitive", () => {
    const profile = profileWith({ skills: [{ id: "s1", name: "typescript" }] });
    expect(matchKeywords(["TYPESCRIPT"], profile).found).toEqual(["TYPESCRIPT"]);
  });

  it("finds a keyword mentioned in bullet text even if not tagged as a skill", () => {
    const profile = profileWith({
      experiences: [
        {
          id: "e1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020",
          current: true,
          bullets: [{ id: "b1", text: "Migrated the pipeline to Kubernetes", skills: [], metrics: [], tags: [] }],
        },
      ],
    });
    expect(matchKeywords(["Kubernetes"], profile).found).toEqual(["Kubernetes"]);
  });

  it("does not treat a substring match as found (word-boundary only)", () => {
    const profile = profileWith({
      experiences: [
        {
          id: "e1",
          company: "Google",
          title: "Engineer",
          startDate: "2020",
          current: true,
          bullets: [{ id: "b1", text: "Worked at Google on ads infra", skills: [], metrics: [], tags: [] }],
        },
      ],
    });
    // "Go" should not match inside "Google"
    expect(matchKeywords(["Go"], profile).found).toEqual([]);
  });

  it("reports a keyword with no match anywhere as missing", () => {
    const profile = profileWith({ skills: [{ id: "s1", name: "Python" }] });
    const { found, missing } = matchKeywords(["Rust"], profile);
    expect(found).toEqual([]);
    expect(missing).toEqual(["Rust"]);
  });

  it("returns empty results for an empty keyword list", () => {
    expect(matchKeywords([], emptyMasterProfile())).toEqual({ found: [], missing: [] });
  });
});

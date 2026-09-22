import { describe, expect, it } from "vitest";
import { lintCoverLetter, lintResumeBullets } from "./lint";

describe("lintResumeBullets", () => {
  it("returns no issues for clean bullets", () => {
    const issues = lintResumeBullets(["Led the checkout redesign, cutting load time 40%."], ["leveraged"]);
    expect(issues).toEqual([]);
  });

  it("flags a banned phrase, case-insensitively", () => {
    const issues = lintResumeBullets(["Leveraged React to ship the redesign."], ["leveraged"]);
    expect(issues.some((i) => i.code === "banned-phrase")).toBe(true);
  });

  it("flags more than 2 bullets starting with the same verb", () => {
    const issues = lintResumeBullets(
      ["Led the redesign.", "Led the migration.", "Led onboarding.", "Owned the API."],
      [],
    );
    const repeated = issues.filter((i) => i.code === "repeated-starting-verb");
    expect(repeated).toHaveLength(1);
    expect(repeated[0]?.message).toContain("led");
  });

  it("does not flag exactly 2 bullets starting with the same verb", () => {
    const issues = lintResumeBullets(["Led the redesign.", "Led the migration.", "Owned the API."], []);
    expect(issues.some((i) => i.code === "repeated-starting-verb")).toBe(false);
  });

  it("flags a bullet longer than 2 lines", () => {
    const longBullet = "Led ".repeat(60).trim() + ".";
    const issues = lintResumeBullets([longBullet], []);
    expect(issues.some((i) => i.code === "bullet-too-long")).toBe(true);
  });

  it("does not flag a normal-length bullet", () => {
    const issues = lintResumeBullets(["Led the checkout redesign, cutting load time by 40% for 2M users."], []);
    expect(issues.some((i) => i.code === "bullet-too-long")).toBe(false);
  });

  it("flags em-dash overuse within a single bullet", () => {
    const issues = lintResumeBullets(["Led the redesign — end to end — across three teams."], []);
    expect(issues.some((i) => i.code === "em-dash-overuse")).toBe(true);
  });

  it("allows a single em dash", () => {
    const issues = lintResumeBullets(["Led the redesign — end to end."], []);
    expect(issues.some((i) => i.code === "em-dash-overuse")).toBe(false);
  });

  it("flags an exclamation mark", () => {
    const issues = lintResumeBullets(["Shipped the redesign!"], []);
    expect(issues.some((i) => i.code === "exclamation-mark")).toBe(true);
  });

  it("tags each per-bullet issue with the correct bulletIndex", () => {
    const issues = lintResumeBullets(["Fine.", "Shipped it!"], []);
    const exMark = issues.find((i) => i.code === "exclamation-mark");
    expect(exMark?.bulletIndex).toBe(1);
  });

  it("returns no issues for an empty bullet list", () => {
    expect(lintResumeBullets([], ["leveraged"])).toEqual([]);
  });
});

describe("lintCoverLetter", () => {
  it("returns no issues for a clean letter", () => {
    expect(lintCoverLetter("I'd bring my backend experience to this role.", ["thrilled"])).toEqual([]);
  });

  it("flags a banned phrase in the body", () => {
    const issues = lintCoverLetter("I am thrilled to apply for this role.", ["thrilled"]);
    expect(issues.some((i) => i.code === "banned-phrase")).toBe(true);
  });

  it("flags em-dash overuse across the body", () => {
    const issues = lintCoverLetter("I led the redesign — end to end — across teams.", []);
    expect(issues.some((i) => i.code === "em-dash-overuse")).toBe(true);
  });

  it("flags an exclamation mark", () => {
    const issues = lintCoverLetter("I would love to join your team!", []);
    expect(issues.some((i) => i.code === "exclamation-mark")).toBe(true);
  });
});

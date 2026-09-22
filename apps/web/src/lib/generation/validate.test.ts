import { describe, expect, it } from "vitest";
import { emptyMasterProfile, type MasterProfile } from "@applydesk/shared";
import { extractNumberTokens, validateCoverLetter, validateResumeBullets, validateSkills } from "./validate";

describe("extractNumberTokens", () => {
  it("extracts a plain integer", () => {
    expect(extractNumberTokens("Led a team of 5 engineers")).toEqual(["5"]);
  });

  it("extracts a percentage's digits", () => {
    expect(extractNumberTokens("Improved latency by 40%")).toEqual(["40"]);
  });

  it("extracts a dollar amount's digits", () => {
    expect(extractNumberTokens("Saved $1.2M annually")).toEqual(["1.2"]);
  });

  it("strips thousands separators", () => {
    expect(extractNumberTokens("Reached 1,200,000 users")).toEqual(["1200000"]);
  });

  it("extracts multiple numbers from one string", () => {
    expect(extractNumberTokens("Grew revenue from $2M to $5M")).toEqual(["2", "5"]);
  });

  it("returns an empty array when there are no numbers", () => {
    expect(extractNumberTokens("Led backend architecture")).toEqual([]);
  });

  it("extracts a spelled-out number normalized to its digit form", () => {
    expect(extractNumberTokens("Six years of experience")).toEqual(["6"]);
  });

  it("extracts both digit and spelled-out numbers from the same string", () => {
    expect(extractNumberTokens("Led a team of five to cut costs by 40%")).toEqual(["40", "5"]);
  });
});

describe("validateResumeBullets", () => {
  const sources = new Map([
    ["b1", "Reduced page load time by 40% for 2M users"],
    ["b2", "Managed a team of 5 engineers"],
  ]);

  it("passes a bullet whose numbers all appear in its source", () => {
    const { violations, invalidBulletIndexes } = validateResumeBullets(
      [{ sourceBulletIds: ["b1"], text: "Cut load time 40% across 2M users" }],
      sources,
    );
    expect(violations).toEqual([]);
    expect(invalidBulletIndexes).toEqual([]);
  });

  it("passes when a number is reformatted but the digits match", () => {
    const { violations } = validateResumeBullets(
      [{ sourceBulletIds: ["b1"], text: "Improved performance 40 percent" }],
      sources,
    );
    expect(violations).toEqual([]);
  });

  it("flags a bullet with no source bullet ids", () => {
    const { violations, invalidBulletIndexes } = validateResumeBullets(
      [{ sourceBulletIds: [], text: "Led something" }],
      sources,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("no-source");
    expect(invalidBulletIndexes).toEqual([0]);
  });

  it("flags a bullet citing an unknown source id", () => {
    const { violations, invalidBulletIndexes } = validateResumeBullets(
      [{ sourceBulletIds: ["ghost"], text: "Led something" }],
      sources,
    );
    expect(violations.some((v) => v.code === "invalid-source-id")).toBe(true);
    expect(invalidBulletIndexes).toEqual([0]);
  });

  it("flags a bullet with an invented number not present in any cited source", () => {
    const { violations, invalidBulletIndexes } = validateResumeBullets(
      [{ sourceBulletIds: ["b1"], text: "Cut load time 90%" }],
      sources,
    );
    expect(violations.some((v) => v.code === "invented-number" && v.message.includes("90"))).toBe(true);
    expect(invalidBulletIndexes).toEqual([0]);
  });

  it("allows a number sourced from a second cited bullet, not the first", () => {
    const { violations } = validateResumeBullets(
      [{ sourceBulletIds: ["b1", "b2"], text: "Led a team of 5 that cut load time 40%" }],
      sources,
    );
    expect(violations).toEqual([]);
  });

  it("passes a bullet with no numbers at all regardless of source content", () => {
    const { violations } = validateResumeBullets(
      [{ sourceBulletIds: ["b1"], text: "Owned the checkout redesign end to end" }],
      sources,
    );
    expect(violations).toEqual([]);
  });

  it("tracks violating bullet indexes independently across multiple bullets", () => {
    const { invalidBulletIndexes } = validateResumeBullets(
      [
        { sourceBulletIds: ["b1"], text: "Cut load time 40%" },
        { sourceBulletIds: ["b2"], text: "Managed a team of 5" },
        { sourceBulletIds: ["b1"], text: "Cut load time 99%" },
      ],
      sources,
    );
    expect(invalidBulletIndexes).toEqual([2]);
  });

  it("returns no violations for an empty bullet list", () => {
    expect(validateResumeBullets([], sources).violations).toEqual([]);
  });
});

describe("validateSkills", () => {
  function profileWith(skillNames: string[], bulletSkills: string[] = []): MasterProfile {
    const base = emptyMasterProfile();
    return {
      ...base,
      skills: skillNames.map((name, i) => ({ id: `s${i}`, name })),
      experiences:
        bulletSkills.length > 0
          ? [
              {
                id: "e1",
                company: "Acme",
                title: "Engineer",
                startDate: "2020-01",
                current: true,
                bullets: [{ id: "b1", text: "Did things", skills: bulletSkills, metrics: [], tags: [] }],
              },
            ]
          : [],
    };
  }

  it("passes a skill present in the explicit skills list", () => {
    expect(validateSkills(["TypeScript"], profileWith(["TypeScript"])).violations).toEqual([]);
  });

  it("matches case-insensitively", () => {
    expect(validateSkills(["typescript"], profileWith(["TypeScript"])).violations).toEqual([]);
  });

  it("passes a skill only present as a bullet tag", () => {
    expect(validateSkills(["Kafka"], profileWith([], ["Kafka"])).violations).toEqual([]);
  });

  it("flags a skill that exists nowhere in the profile and reports its name", () => {
    const { violations, invalidSkills } = validateSkills(["Rust"], profileWith(["TypeScript"]));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("unknown-skill");
    expect(invalidSkills).toEqual(["Rust"]);
  });

  it("returns no violations for an empty skills list", () => {
    expect(validateSkills([], profileWith(["TypeScript"])).violations).toEqual([]);
  });
});

describe("validateCoverLetter", () => {
  const sources = new Map([
    ["b1", "Reduced page load time by 40%"],
    ["b2", "Managed a team of 5 engineers"],
    ["b3", "Shipped the checkout redesign"],
  ]);

  it("passes a letter within the 2-accomplishment limit with grounded numbers", () => {
    const violations = validateCoverLetter(
      "I cut load time by 40% and led a team of 5.",
      ["b1", "b2"],
      sources,
    );
    expect(violations).toEqual([]);
  });

  it("flags more than 2 referenced accomplishments", () => {
    const violations = validateCoverLetter("...", ["b1", "b2", "b3"], sources);
    expect(violations.some((v) => v.code === "too-many-accomplishments")).toBe(true);
  });

  it("flags an unknown referenced bullet id", () => {
    const violations = validateCoverLetter("...", ["ghost"], sources);
    expect(violations.some((v) => v.code === "invalid-source-id")).toBe(true);
  });

  it("flags a number in the body not present in any referenced bullet", () => {
    const violations = validateCoverLetter("I cut load time by 90%.", ["b1"], sources);
    expect(violations.some((v) => v.code === "invented-number")).toBe(true);
  });

  it("flags a spelled-out invented number not grounded in any referenced bullet", () => {
    const violations = validateCoverLetter("I have six years of experience.", [], sources);
    expect(violations.some((v) => v.code === "invented-number")).toBe(true);
  });

  it("passes a letter with zero referenced accomplishments and no numbers", () => {
    expect(validateCoverLetter("I'd love to bring my backend experience to this role.", [], sources)).toEqual([]);
  });
});

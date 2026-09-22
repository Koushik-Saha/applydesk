import { describe, expect, it } from "vitest";
import { bandForScore, computeScore } from "./scoring";

describe("computeScore", () => {
  it("computes the exact formula for a typical mixed case", () => {
    // mustHave: 3 met, 1 partial, 1 missing -> (3 + 0.5)/5 = 0.7
    // niceToHave: 1 met, 1 missing -> (1 + 0)/2 = 0.5
    // keywords: 6/10 = 0.6
    // score = round(100 * (0.7*0.7 + 0.2*0.5 + 0.1*0.6)) = round(100*(0.49+0.1+0.06)) = round(65) = 65
    const result = computeScore({
      mustHaveStatuses: ["met", "met", "met", "partial", "missing"],
      niceToHaveStatuses: ["met", "missing"],
      keywordsFound: 6,
      keywordsTotal: 10,
    });
    expect(result.mustRatio).toBeCloseTo(0.7);
    expect(result.niceRatio).toBeCloseTo(0.5);
    expect(result.keywordRatio).toBeCloseTo(0.6);
    expect(result.score).toBe(65);
    expect(result.band).toBe("Good");
  });

  it("defaults niceRatio to 1.0 when there are no nice-to-haves", () => {
    const result = computeScore({
      mustHaveStatuses: ["met", "met", "met", "met"],
      niceToHaveStatuses: [],
      keywordsFound: 5,
      keywordsTotal: 5,
    });
    expect(result.niceRatio).toBe(1);
    // score = round(100*(0.7*1 + 0.2*1 + 0.1*1)) = 100
    expect(result.score).toBe(100);
    expect(result.band).toBe("Strong");
  });

  it("defaults keywordRatio to 1.0 when there are zero keywords", () => {
    const result = computeScore({
      mustHaveStatuses: ["met", "missing"],
      niceToHaveStatuses: ["met"],
      keywordsFound: 0,
      keywordsTotal: 0,
    });
    expect(result.keywordRatio).toBe(1);
    // mustRatio = 0.5, niceRatio = 1
    // score = round(100*(0.7*0.5 + 0.2*1 + 0.1*1)) = round(100*(0.35+0.2+0.1)) = round(65) = 65
    expect(result.score).toBe(65);
  });

  it("defaults mustRatio to 1.0 when there are zero must-haves", () => {
    const result = computeScore({
      mustHaveStatuses: [],
      niceToHaveStatuses: [],
      keywordsFound: 0,
      keywordsTotal: 0,
    });
    expect(result.mustRatio).toBe(1);
    expect(result.score).toBe(100);
    expect(result.band).toBe("Strong");
  });

  it("scores zero when everything is missing and no keywords match", () => {
    const result = computeScore({
      mustHaveStatuses: ["missing", "missing"],
      niceToHaveStatuses: ["missing"],
      keywordsFound: 0,
      keywordsTotal: 5,
    });
    expect(result.mustRatio).toBe(0);
    expect(result.niceRatio).toBe(0);
    expect(result.keywordRatio).toBe(0);
    expect(result.score).toBe(0);
    expect(result.band).toBe("Weak");
  });

  it("treats partial as half credit", () => {
    const result = computeScore({
      mustHaveStatuses: ["partial", "partial"],
      niceToHaveStatuses: [],
      keywordsFound: 1,
      keywordsTotal: 1,
    });
    expect(result.mustRatio).toBe(0.5);
  });
});

describe("bandForScore", () => {
  it.each([
    [100, "Strong"],
    [80, "Strong"],
    [79, "Good"],
    [65, "Good"],
    [64, "Stretch"],
    [50, "Stretch"],
    [49, "Weak"],
    [0, "Weak"],
  ] as const)("scores %i as %s", (score, band) => {
    expect(bandForScore(score)).toBe(band);
  });
});

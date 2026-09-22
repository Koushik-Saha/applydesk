import { describe, expect, it } from "vitest";
import { extractMetrics } from "./extract-metrics";

describe("extractMetrics", () => {
  it("finds a plain number", () => {
    expect(extractMetrics("Led a team of 15 engineers")).toEqual(["15"]);
  });

  it("finds a percentage", () => {
    expect(extractMetrics("Improved load time by 40%")).toEqual(["40%"]);
  });

  it("finds a dollar amount with a magnitude suffix", () => {
    expect(extractMetrics("Managed a $2.5M budget")).toEqual(["$2.5M"]);
  });

  it("finds a comma-separated dollar amount with no suffix", () => {
    expect(extractMetrics("Closed a $120,000 deal")).toEqual(["$120,000"]);
  });

  it("finds a trailing-plus number", () => {
    expect(extractMetrics("Supported 10+ years of production traffic")).toEqual(["10+"]);
  });

  it("finds every metric in a bullet with several", () => {
    expect(
      extractMetrics("Increased revenue by 40% to $2.5M across 15 markets"),
    ).toEqual(["40%", "$2.5M", "15"]);
  });

  it("does not double-count digits inside a % or $ match as a separate plain number", () => {
    const result = extractMetrics("Grew signups 40%");
    expect(result).toEqual(["40%"]);
    expect(result).not.toContain("40");
  });

  it("returns an empty array when there are no metrics", () => {
    expect(extractMetrics("Led cross-functional collaboration on a new platform")).toEqual([]);
  });
});

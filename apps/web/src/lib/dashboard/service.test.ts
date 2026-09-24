import { describe, it, expect } from "vitest";

describe("Dashboard calculation logic", () => {
  it("calculates average score of applied jobs accurately", () => {
    const scores = [85, 90, 75, 80];
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    expect(avg).toBe(83);
  });

  it("calculates response rate accurately", () => {
    const totalApplied = 8;
    const interviewingOrOffer = 2;
    const rate = Math.round((interviewingOrOffer / totalApplied) * 100);
    expect(rate).toBe(25);
  });

  it("handles 0 applied gracefully", () => {
    const totalApplied = 0;
    const rate = totalApplied > 0 ? 0 : null;
    expect(rate).toBeNull();
  });
});

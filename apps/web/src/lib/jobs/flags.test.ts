import { describe, expect, it } from "vitest";
import type { Requirements } from "@/lib/ai/prompts/job-analyze";
import { computeJobFlags } from "./flags";

function reqs(overrides: Partial<Requirements> = {}): Requirements {
  return {
    mustHave: [],
    niceToHave: [],
    responsibilities: [],
    keywords: [],
    seniority: "",
    sponsorshipMentioned: false,
    redFlags: [],
    ...overrides,
  };
}

describe("computeJobFlags", () => {
  it("flags a years gap when the candidate has fewer years than required", () => {
    const flags = computeJobFlags({ requirements: reqs({ minYears: 8 }), candidateYears: 6 });
    expect(flags.yearsGap).toBe(true);
  });

  it("does not flag a years gap when the candidate meets or exceeds the minimum", () => {
    const flags = computeJobFlags({ requirements: reqs({ minYears: 5 }), candidateYears: 6 });
    expect(flags.yearsGap).toBe(false);
  });

  it("does not flag a years gap when minYears is unstated", () => {
    const flags = computeJobFlags({ requirements: reqs(), candidateYears: 2 });
    expect(flags.yearsGap).toBe(false);
  });

  it("flags clearance from redFlags text", () => {
    const flags = computeJobFlags({
      requirements: reqs({ redFlags: ["Requires an active security clearance"] }),
    });
    expect(flags.clearance).toBe(true);
  });

  it("flags clearance mentioned in mustHave even if not in redFlags", () => {
    const flags = computeJobFlags({ requirements: reqs({ mustHave: ["Active TS/SCI clearance"] }) });
    expect(flags.clearance).toBe(true);
  });

  it("flags sponsorship when explicitly mentioned", () => {
    const flags = computeJobFlags({ requirements: reqs({ sponsorshipMentioned: true }) });
    expect(flags.sponsorship).toBe(true);
  });

  it("flags a location mismatch for an onsite role in a different city, when not willing to relocate", () => {
    const flags = computeJobFlags({
      requirements: reqs({ location: "New York, NY", remote: "onsite" }),
      candidateLocation: "Austin, TX",
      willingToRelocate: false,
    });
    expect(flags.locationMismatch).toBe(true);
  });

  it("does not flag a location mismatch for a remote role", () => {
    const flags = computeJobFlags({
      requirements: reqs({ location: "New York, NY", remote: "remote" }),
      candidateLocation: "Austin, TX",
    });
    expect(flags.locationMismatch).toBe(false);
  });

  it("does not flag a location mismatch when willing to relocate", () => {
    const flags = computeJobFlags({
      requirements: reqs({ location: "New York, NY", remote: "onsite" }),
      candidateLocation: "Austin, TX",
      willingToRelocate: true,
    });
    expect(flags.locationMismatch).toBe(false);
  });

  it("does not flag a location mismatch when the city text overlaps", () => {
    const flags = computeJobFlags({
      requirements: reqs({ location: "Austin, TX (Hybrid)", remote: "hybrid" }),
      candidateLocation: "Austin, TX",
    });
    expect(flags.locationMismatch).toBe(false);
  });

  it("passes redFlags through unchanged", () => {
    const flags = computeJobFlags({ requirements: reqs({ redFlags: ["Commission-only pay"] }) });
    expect(flags.redFlags).toEqual(["Commission-only pay"]);
  });

  it("flags nothing for a clean, fully-remote posting with no gaps", () => {
    const flags = computeJobFlags({
      requirements: reqs({ minYears: 3, remote: "remote" }),
      candidateYears: 5,
      candidateLocation: "Austin, TX",
    });
    expect(flags).toEqual({
      yearsGap: false,
      clearance: false,
      sponsorship: false,
      locationMismatch: false,
      redFlags: [],
    });
  });
});

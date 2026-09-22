import { describe, expect, it } from "vitest";
import type { EvidenceItem } from "@/lib/ai/prompts/job-analyze";
import { verifyEvidence } from "./evidence";

function item(overrides: Partial<EvidenceItem>): EvidenceItem {
  return {
    requirement: "5+ years of React",
    type: "must",
    status: "met",
    evidenceBulletIds: [],
    reason: "test",
    ...overrides,
  };
}

describe("verifyEvidence", () => {
  const validIds = new Set(["b1", "b2"]);

  it("leaves a met item unchanged when all evidence ids are valid", () => {
    const [result] = verifyEvidence([item({ status: "met", evidenceBulletIds: ["b1", "b2"] })], validIds);
    expect(result!.status).toBe("met");
    expect(result!.evidenceBulletIds).toEqual(["b1", "b2"]);
  });

  it("drops an unknown id and keeps the rest", () => {
    const [result] = verifyEvidence(
      [item({ status: "met", evidenceBulletIds: ["b1", "fake-id"] })],
      validIds,
    );
    expect(result!.evidenceBulletIds).toEqual(["b1"]);
  });

  it("downgrades met to partial when an invalid id was dropped but valid evidence remains", () => {
    const [result] = verifyEvidence(
      [item({ status: "met", evidenceBulletIds: ["b1", "fake-id"] })],
      validIds,
    );
    expect(result!.status).toBe("partial");
  });

  it("downgrades partial to missing when an invalid id was dropped", () => {
    const [result] = verifyEvidence(
      [item({ status: "partial", evidenceBulletIds: ["fake-id"] })],
      validIds,
    );
    expect(result!.status).toBe("missing");
  });

  it("forces missing when zero valid evidence remains, even without a downgrade trigger", () => {
    // model claimed "met" but gave zero evidence ids at all (no hallucination
    // detected per se, just an unsupported claim) -> still forced to missing
    const [result] = verifyEvidence([item({ status: "met", evidenceBulletIds: [] })], validIds);
    expect(result!.status).toBe("missing");
  });

  it("leaves missing as missing regardless of dropped ids", () => {
    const [result] = verifyEvidence(
      [item({ status: "missing", evidenceBulletIds: ["fake-id"] })],
      validIds,
    );
    expect(result!.status).toBe("missing");
    expect(result!.evidenceBulletIds).toEqual([]);
  });

  it("processes multiple items independently", () => {
    const results = verifyEvidence(
      [
        item({ requirement: "A", status: "met", evidenceBulletIds: ["b1"] }),
        item({ requirement: "B", status: "met", evidenceBulletIds: ["fake"] }),
      ],
      validIds,
    );
    expect(results[0]!.status).toBe("met");
    expect(results[1]!.status).toBe("missing");
  });
});

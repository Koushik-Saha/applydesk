import { describe, expect, it } from "vitest";
import { emptyMasterProfile, masterProfileSchema } from "./master-profile";

describe("emptyMasterProfile", () => {
  it("produces a schema-valid empty profile", () => {
    const profile = emptyMasterProfile();
    expect(masterProfileSchema.safeParse(profile).success).toBe(true);
    expect(profile.experiences).toEqual([]);
    expect(profile.skills).toEqual([]);
  });
});

describe("masterProfileSchema", () => {
  it("defaults a bullet's array fields to empty arrays", () => {
    const parsed = masterProfileSchema.parse({
      contact: { fullName: "Jane Doe" },
      experiences: [
        {
          id: "exp_1",
          company: "Acme",
          title: "Engineer",
          startDate: "2020-01",
          bullets: [{ id: "b_1", text: "Shipped things" }],
        },
      ],
    });
    expect(parsed.experiences[0]?.bullets[0]).toMatchObject({
      id: "b_1",
      text: "Shipped things",
      skills: [],
      metrics: [],
      tags: [],
    });
  });

  it("rejects an experience missing a required field", () => {
    const result = masterProfileSchema.safeParse({
      contact: { fullName: "Jane Doe" },
      experiences: [{ id: "exp_1", title: "Engineer", startDate: "2020-01" }],
    });
    expect(result.success).toBe(false);
  });
});

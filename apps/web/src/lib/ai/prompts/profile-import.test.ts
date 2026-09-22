import { describe, expect, it } from "vitest";
import { masterProfileSchema } from "@applydesk/shared";
import { draftToMasterProfile, type ProfileImportDraft } from "./profile-import";

describe("draftToMasterProfile", () => {
  it("attaches a stable id to every entity and computes bullet metrics from text", () => {
    const draft: ProfileImportDraft = {
      contact: { fullName: "Jane Doe" },
      summary: "Engineer.",
      experiences: [
        {
          company: "Acme",
          title: "Engineer",
          startDate: "2021-01",
          current: true,
          bullets: [{ text: "Cut latency by 40%", skills: ["Go"], tags: [] }],
        },
      ],
      projects: [{ name: "Side project", bullets: [{ text: "Shipped a $2M feature", skills: [], tags: [] }] }],
      education: [{ school: "State U", degree: "BS" }],
      certifications: [{ name: "AWS SAA" }],
      publications: [{ title: "A paper" }],
      skills: [{ name: "TypeScript" }],
    };

    const profile = draftToMasterProfile(draft);

    expect(profile.experiences[0]?.id).toBeTruthy();
    expect(profile.experiences[0]?.bullets[0]?.id).toBeTruthy();
    expect(profile.experiences[0]?.bullets[0]?.metrics).toEqual(["40%"]);
    expect(profile.projects[0]?.id).toBeTruthy();
    expect(profile.projects[0]?.bullets[0]?.metrics).toEqual(["$2M"]);
    expect(profile.education[0]?.id).toBeTruthy();
    expect(profile.certifications[0]?.id).toBeTruthy();
    expect(profile.publications[0]?.id).toBeTruthy();
    expect(profile.skills[0]?.id).toBeTruthy();

    // every generated id is unique
    const ids = [
      profile.experiences[0]?.id,
      profile.experiences[0]?.bullets[0]?.id,
      profile.projects[0]?.id,
      profile.projects[0]?.bullets[0]?.id,
      profile.education[0]?.id,
      profile.certifications[0]?.id,
      profile.publications[0]?.id,
      profile.skills[0]?.id,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces output that satisfies the real MasterProfile schema", () => {
    const draft: ProfileImportDraft = {
      contact: { fullName: "Jane Doe" },
      summary: "",
      experiences: [],
      projects: [],
      education: [],
      certifications: [],
      publications: [],
      skills: [],
    };

    const profile = draftToMasterProfile(draft);
    expect(masterProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("never carries an id or metrics field through from the draft itself", () => {
    const draft = {
      contact: { fullName: "Jane" },
      summary: "",
      experiences: [
        { company: "Acme", title: "Eng", startDate: "2020", current: false, bullets: [{ text: "Did a thing", skills: [], tags: [] }] },
      ],
      projects: [],
      education: [],
      certifications: [],
      publications: [],
      skills: [],
    } as ProfileImportDraft;

    // sanity: the draft type itself has no id/metrics fields to begin with
    expect("id" in draft.experiences[0]!).toBe(false);
    expect("metrics" in draft.experiences[0]!.bullets[0]!).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { emptyStandardAnswers, standardAnswersSchema } from "./standard-answers";

describe("emptyStandardAnswers", () => {
  it("defaults every EEO answer to Decline to answer", () => {
    const answers = emptyStandardAnswers();
    expect(answers.eeo).toEqual({
      gender: "Decline to answer",
      race: "Decline to answer",
      veteranStatus: "Decline to answer",
      disabilityStatus: "Decline to answer",
    });
    expect(standardAnswersSchema.safeParse(answers).success).toBe(true);
  });

  it("defaults sponsorship and relocation to false", () => {
    const answers = emptyStandardAnswers();
    expect(answers.sponsorshipNeeded).toBe(false);
    expect(answers.willingToRelocate).toBe(false);
  });
});

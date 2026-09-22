import { z } from "zod";

// PROJECT_SPEC.md §4.1 — "used by the extension" to autofill ATS forms.
// EEO answers default to "Decline to answer", per the spec text.
const DECLINE = "Decline to answer";

export const eeoAnswersSchema = z.object({
  gender: z.string().default(DECLINE),
  race: z.string().default(DECLINE),
  veteranStatus: z.string().default(DECLINE),
  disabilityStatus: z.string().default(DECLINE),
});

export const standardAnswersSchema = z.object({
  legalName: z.string().default(""),
  preferredName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  cityState: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  workAuthorization: z.string().optional(),
  sponsorshipNeeded: z.boolean().default(false),
  willingToRelocate: z.boolean().default(false),
  noticePeriod: z.string().optional(),
  salaryExpectation: z.string().optional(),
  yearsOfExperience: z.number().nonnegative().optional(),
  pronouns: z.string().optional(),
  eeo: eeoAnswersSchema.default({
    gender: DECLINE,
    race: DECLINE,
    veteranStatus: DECLINE,
    disabilityStatus: DECLINE,
  }),
});

export type EeoAnswers = z.infer<typeof eeoAnswersSchema>;
export type StandardAnswers = z.infer<typeof standardAnswersSchema>;

export function emptyStandardAnswers(): StandardAnswers {
  return standardAnswersSchema.parse({});
}

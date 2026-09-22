import type { Requirements } from "@/lib/ai/prompts/job-analyze";

// PROJECT_SPEC.md §4.3 — "Hard flags shown separately (never folded into
// the number): years gap, clearance, sponsorship, location mismatch, red
// flags." Pure/deterministic, same principle as scoring.ts.
export interface JobFlags {
  yearsGap: boolean;
  clearance: boolean;
  sponsorship: boolean;
  locationMismatch: boolean;
  redFlags: string[];
}

export interface ComputeJobFlagsParams {
  requirements: Requirements;
  candidateYears?: number;
  candidateLocation?: string;
  willingToRelocate?: boolean;
}

export function computeJobFlags(params: ComputeJobFlagsParams): JobFlags {
  const { requirements, candidateYears, candidateLocation, willingToRelocate } = params;

  const clearance =
    requirements.redFlags.some((f) => /clearance/i.test(f)) ||
    requirements.mustHave.some((f) => /clearance/i.test(f));

  const yearsGap =
    requirements.minYears != null && candidateYears != null && candidateYears < requirements.minYears;

  const sponsorship = requirements.sponsorshipMentioned === true;

  const jobLocation = requirements.location?.toLowerCase().trim();
  const ownLocation = candidateLocation?.toLowerCase().trim();
  const locationMismatch =
    requirements.remote !== "remote" &&
    !!jobLocation &&
    !!ownLocation &&
    !willingToRelocate &&
    !jobLocation.includes(ownLocation) &&
    !ownLocation.includes(jobLocation);

  return { yearsGap, clearance, sponsorship, locationMismatch, redFlags: requirements.redFlags };
}

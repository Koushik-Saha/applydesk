import type { AtsAdapter } from "../types";

// Known selectors for Ashby's embedded application form (jobs.ashbyhq.com),
// which names fields with a "_systemfield_" prefix.
export const ashbyAdapter: AtsAdapter = {
  detect: (doc) =>
    doc.querySelector('[name^="_systemfield_"]') !== null ||
    doc.querySelector("#ashby_embed") !== null,
  fieldSelectors: {
    legalName: 'input[name="_systemfield_name"]',
    email: 'input[name="_systemfield_email"]',
    phone: 'input[name="_systemfield_phone"]',
    cityState: 'input[name="_systemfield_location"]',
  },
  resumeInputSelector: 'input[type="file"][name="_systemfield_resume"]',
};

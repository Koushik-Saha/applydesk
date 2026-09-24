import type { AtsAdapter } from "../types";

// Known selectors for the Greenhouse job_application form (boards.greenhouse.io).
export const greenhouseAdapter: AtsAdapter = {
  detect: (doc) =>
    doc.querySelector("#grnhse_app") !== null ||
    doc.querySelector('form[id*="application"]') !== null && doc.querySelector("#first_name") !== null,
  splitNameSelectors: { first: "#first_name", last: "#last_name" },
  fieldSelectors: {
    email: "#email",
    phone: "#phone",
  },
  resumeInputSelector: 'input[type="file"]#resume, input[type="file"][name*="resume" i]',
  coverLetterInputSelector: 'input[type="file"]#cover_letter, input[type="file"][name*="cover_letter" i]',
};

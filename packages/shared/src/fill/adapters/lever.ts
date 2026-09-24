import type { AtsAdapter } from "../types";

// Known selectors for the Lever application form (jobs.lever.co).
export const leverAdapter: AtsAdapter = {
  detect: (doc) =>
    doc.querySelector("form.application-form") !== null ||
    doc.querySelector('input[name="name"][id="name-input"]') !== null,
  fieldSelectors: {
    legalName: '#name-input, input[name="name"]',
    email: '#email-input, input[name="email"]',
    phone: '#phone-input, input[name="phone"]',
    linkedin: 'input[name="urls[LinkedIn]"]',
    github: 'input[name="urls[GitHub]"]',
    portfolio: 'input[name="urls[Portfolio]"]',
  },
  resumeInputSelector: 'input[type="file"][name="resume"]',
};

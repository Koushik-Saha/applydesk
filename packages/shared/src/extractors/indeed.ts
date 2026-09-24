import type { ExtractorFn } from "./types";

export const extractIndeed: ExtractorFn = (doc, pageUrl = "") => {
  const isIndeed =
    pageUrl.includes("indeed.com") ||
    doc.querySelector(".jobsearch-JobInfoHeader-title") !== null ||
    doc.querySelector("#jobDescriptionText") !== null;

  if (!isIndeed) return null;

  const titleEl =
    doc.querySelector(".jobsearch-JobInfoHeader-title") ||
    doc.querySelector("[data-testid='jobsearch-JobInfoHeader-title']") ||
    doc.querySelector("h1");
  const title = titleEl?.textContent?.trim() || "";

  const companyEl =
    doc.querySelector("[data-testid='inlineHeader-companyName']") ||
    doc.querySelector(".jobsearch-CompanyInfoContainer") ||
    doc.querySelector(".jobsearch-InlineCompanyRating-companyHeader");
  const company = companyEl?.textContent?.trim() || "";

  const locationEl =
    doc.querySelector("[data-testid='inlineHeader-companyLocation']") ||
    doc.querySelector(".jobsearch-JobInfoHeader-companyLocation");
  const location = locationEl?.textContent?.trim() || undefined;

  const descEl =
    doc.querySelector("#jobDescriptionText") ||
    doc.querySelector(".jobsearch-jobDescriptionText");
  const description = descEl?.textContent?.trim() || "";

  return {
    title,
    company,
    location,
    description,
    url: pageUrl,
    atsType: "indeed",
  };
};

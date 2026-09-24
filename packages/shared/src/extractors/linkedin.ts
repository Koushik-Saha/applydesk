import type { ExtractorFn } from "./types";

export const extractLinkedIn: ExtractorFn = (doc, pageUrl = "") => {
  const isLinkedIn =
    pageUrl.includes("linkedin.com") ||
    doc.querySelector(".job-details-jobs-unified-top-card__job-title") !== null ||
    doc.querySelector("#job-details") !== null;

  if (!isLinkedIn) return null;

  const titleEl =
    doc.querySelector(".job-details-jobs-unified-top-card__job-title") ||
    doc.querySelector(".jobs-unified-top-card__job-title") ||
    doc.querySelector(".topcard__title") ||
    doc.querySelector("h1");
  const title = titleEl?.textContent?.trim() || "";

  const companyEl =
    doc.querySelector(".job-details-jobs-unified-top-card__company-name") ||
    doc.querySelector(".jobs-unified-top-card__company-name") ||
    doc.querySelector(".topcard__org-name-link");
  const company = companyEl?.textContent?.trim() || "";

  const locationEl =
    doc.querySelector(".job-details-jobs-unified-top-card__bullet") ||
    doc.querySelector(".jobs-unified-top-card__bullet") ||
    doc.querySelector(".topcard__flavor--bullet");
  const location = locationEl?.textContent?.trim() || undefined;

  const descEl =
    doc.querySelector("#job-details") ||
    doc.querySelector(".jobs-description__content") ||
    doc.querySelector(".show-more-less-html__markup");
  const description = descEl?.textContent?.trim() || "";

  return {
    title,
    company,
    location,
    description,
    url: pageUrl,
    atsType: "linkedin",
  };
};

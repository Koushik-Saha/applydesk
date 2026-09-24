import type { ExtractorFn } from "./types";

export const extractWorkday: ExtractorFn = (doc, pageUrl = "") => {
  const isWorkday =
    pageUrl.includes("myworkdayjobs.com") ||
    doc.querySelector("[data-automation-id='jobPostingHeader']") !== null ||
    doc.querySelector("[data-automation-id='jobPostingDescription']") !== null;

  if (!isWorkday) return null;

  const titleEl =
    doc.querySelector("[data-automation-id='jobPostingHeader']") ||
    doc.querySelector("h1") ||
    doc.querySelector("h2");
  const title = titleEl?.textContent?.trim() || "";

  const companyEl =
    doc.querySelector("[data-automation-id='companyName']") ||
    doc.querySelector(".css-1x0x5w3");
  let company = companyEl?.textContent?.trim() || "";

  if (!company && pageUrl) {
    const match = pageUrl.match(/https?:\/\/([^.]+)\.wd\d*\.myworkdayjobs\.com/);
    if (match?.[1]) company = match[1].replace(/[-_]/g, " ");
  }

  const locationEl =
    doc.querySelector("[data-automation-id='locations']") ||
    doc.querySelector("[data-automation-id='location']");
  const location = locationEl?.textContent?.trim() || undefined;

  const descEl =
    doc.querySelector("[data-automation-id='jobPostingDescription']") ||
    doc.querySelector(".css-1e9w7om");
  const description = descEl?.textContent?.trim() || "";

  return {
    title,
    company,
    location,
    description,
    url: pageUrl,
    atsType: "workday",
  };
};

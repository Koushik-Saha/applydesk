import type { ExtractorFn } from "./types";

export const extractLever: ExtractorFn = (doc, pageUrl = "") => {
  const isLever =
    pageUrl.includes("lever.co") ||
    doc.querySelector(".posting-headline") !== null ||
    doc.querySelector(".posting-categories") !== null;

  if (!isLever) return null;

  const titleEl =
    doc.querySelector(".posting-headline h2") ||
    doc.querySelector(".posting-headline") ||
    doc.querySelector("h2");
  const title = titleEl?.textContent?.trim() || "";

  let company = "";
  if (pageUrl) {
    const match = pageUrl.match(/jobs\.lever\.co\/([^/]+)/);
    if (match?.[1]) company = match[1].replace(/[-_]/g, " ");
  }
  if (!company && doc.title) {
    const parts = doc.title.split(/[-–—]/);
    if (parts.length > 1 && parts[0]) company = parts[0].trim();
  }

  const locationEl = doc.querySelector(".posting-categories .location") || doc.querySelector(".location");
  const location = locationEl?.textContent?.trim() || undefined;

  const sectionEl = doc.querySelector(".posting-sections") || doc.querySelector(".section-wrapper") || doc.querySelector(".content");
  const description = sectionEl?.textContent?.trim() || "";

  return {
    title,
    company,
    location,
    description,
    url: pageUrl,
    atsType: "lever",
  };
};

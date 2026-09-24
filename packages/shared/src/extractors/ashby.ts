import type { ExtractorFn } from "./types";

// Finds the <p> that follows an <h2> whose text matches `label`, matching
// the "Location" / "Employment Type" / etc. section layout Ashby renders
// today (no stable class on the value itself, only on the section wrapper).
function sectionValue(doc: Document, label: string): string | undefined {
  const headings = doc.querySelectorAll("h2");
  for (const heading of headings) {
    if (heading.textContent?.trim().toLowerCase() === label.toLowerCase()) {
      const value = heading.nextElementSibling?.textContent?.trim();
      if (value) return value;
    }
  }
  return undefined;
}

export const extractAshby: ExtractorFn = (doc, pageUrl = "") => {
  const isAshby =
    pageUrl.includes("ashbyhq.com") ||
    doc.querySelector("[class*='ashby-job-posting']") !== null ||
    doc.querySelector(".ashby-job-posting") !== null ||
    doc.querySelector("[data-testid='job-title']") !== null;

  if (!isAshby) return null;

  // Ashby's stable, non-hashed hook classes (e.g. "ashby-job-posting-heading")
  // are the reliable selectors — the CSS-module classes alongside them
  // (e.g. "_title_dea4p_33") are hashed per build and change on every deploy.
  const titleEl =
    doc.querySelector(".ashby-job-posting-heading") ||
    doc.querySelector("[data-testid='job-title']") ||
    doc.querySelector(".ashby-job-posting h1") ||
    doc.querySelector("h1");
  const title = titleEl?.textContent?.trim() || "";

  let company = "";
  if (pageUrl) {
    const match = pageUrl.match(/jobs\.ashbyhq\.com\/([^/]+)/);
    if (match?.[1]) company = match[1].replace(/[-_]/g, " ");
  }
  if (!company && doc.title) {
    const parts = doc.title.split(/[-–—]/);
    if (parts.length > 1 && parts[0]) company = parts[0].trim();
  }

  const location =
    sectionValue(doc, "Location") ||
    doc.querySelector(".ashby-job-posting-location")?.textContent?.trim() ||
    doc.querySelector("[data-testid='job-location']")?.textContent?.trim() ||
    undefined;

  const descEl =
    doc.querySelector(".ashby-job-posting-description") ||
    doc.querySelector("[data-testid='job-description']") ||
    doc.querySelector("[class*='_description_']") ||
    doc.querySelector(".ashby-job-posting");
  const description = descEl?.textContent?.trim() || "";

  return {
    title,
    company,
    location,
    description,
    url: pageUrl,
    atsType: "ashby",
  };
};

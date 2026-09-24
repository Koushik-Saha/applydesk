import type { ExtractorFn } from "./types";

export const extractGreenhouse: ExtractorFn = (doc, pageUrl = "") => {
  const isGreenhouse =
    pageUrl.includes("greenhouse.io") ||
    doc.querySelector("#grnhse_app") !== null ||
    doc.querySelector(".app-title") !== null ||
    doc.querySelector("#app_body") !== null;

  if (!isGreenhouse && !pageUrl.includes("gh_jid")) return null;

  const titleEl = doc.querySelector(".app-title") || doc.querySelector("h1.app-title") || doc.querySelector("h1");
  const title = titleEl?.textContent?.trim() || "";

  const companyEl = doc.querySelector(".company-name") || doc.querySelector(".org-name");
  let company = companyEl?.textContent?.replace(/^at\s+/i, "")?.trim() || "";

  if (!company && pageUrl) {
    const match = pageUrl.match(/boards\.greenhouse\.io\/([^/]+)/);
    if (match?.[1]) company = match[1].replace(/[-_]/g, " ");
  }

  const locationEl = doc.querySelector(".location") || doc.querySelector(".job-location");
  const location = locationEl?.textContent?.trim() || undefined;

  const contentEl = doc.querySelector("#content") || doc.querySelector("#app_body") || doc.querySelector(".body");
  const description = contentEl?.textContent?.trim() || "";

  return {
    title,
    company,
    location,
    description,
    url: pageUrl,
    atsType: "greenhouse",
  };
};

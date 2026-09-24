import type { ExtractedJob } from "./types";
import { extractGreenhouse } from "./greenhouse";
import { extractLever } from "./lever";
import { extractAshby } from "./ashby";
import { extractLinkedIn } from "./linkedin";
import { extractIndeed } from "./indeed";
import { extractWorkday } from "./workday";
import { extractGeneric } from "./generic";
import { extractFromSelection } from "./highlighted";

export * from "./types";
export * from "./greenhouse";
export * from "./lever";
export * from "./ashby";
export * from "./linkedin";
export * from "./indeed";
export * from "./workday";
export * from "./generic";
export * from "./highlighted";

export function extractJob(
  doc: Document,
  options?: { url?: string; selection?: string },
): ExtractedJob {
  const url = options?.url || (typeof doc !== "undefined" && doc.location ? doc.location.href : "");
  const selection = options?.selection?.trim();

  if (selection && selection.length > 20) {
    return extractFromSelection(doc, selection, url);
  }

  const extractors = [
    extractGreenhouse,
    extractLever,
    extractAshby,
    extractLinkedIn,
    extractIndeed,
    extractWorkday,
  ];

  for (const extractor of extractors) {
    const res = extractor(doc, url);
    if (res && res.title && res.description) {
      return {
        title: res.title,
        company: res.company || "",
        location: res.location,
        description: res.description,
        url: res.url || url,
        atsType: res.atsType || "other",
      };
    }
  }

  const generic = extractGeneric(doc, url);
  return {
    title: generic?.title || doc.querySelector("h1")?.textContent?.trim() || doc.title || "Job Posting",
    company: generic?.company || "",
    location: generic?.location,
    description: generic?.description || "",
    url: generic?.url || url,
    atsType: generic?.atsType || "other",
  };
}

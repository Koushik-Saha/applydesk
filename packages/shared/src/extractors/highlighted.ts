import type { ExtractedJob, AtsType } from "./types";
import { extractGreenhouse } from "./greenhouse";
import { extractLever } from "./lever";
import { extractAshby } from "./ashby";
import { extractLinkedIn } from "./linkedin";
import { extractIndeed } from "./indeed";
import { extractWorkday } from "./workday";
import { extractGeneric } from "./generic";

export function extractFromSelection(
  doc: Document,
  selectionText: string,
  pageUrl = "",
): ExtractedJob {
  const extractors = [
    extractGreenhouse,
    extractLever,
    extractAshby,
    extractLinkedIn,
    extractIndeed,
    extractWorkday,
  ];

  let title = "";
  let company = "";
  let location: string | undefined;
  let atsType: AtsType = "other";

  for (const extractor of extractors) {
    const res = extractor(doc, pageUrl);
    if (res && res.title) {
      title = res.title;
      company = res.company || "";
      location = res.location;
      atsType = res.atsType || "other";
      break;
    }
  }

  if (!title) {
    const generic = extractGeneric(doc, pageUrl);
    title = generic?.title || doc.querySelector("h1")?.textContent?.trim() || doc.title || "Job Posting";
    company = generic?.company || "";
    location = generic?.location;
    atsType = generic?.atsType || "other";
  }

  return {
    title,
    company,
    location,
    description: selectionText.trim(),
    url: pageUrl,
    atsType,
  };
}


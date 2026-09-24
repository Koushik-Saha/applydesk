import type { ExtractorFn, ExtractedJob } from "./types";

function cleanHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<h[1-6][^>]*>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isJobPostingType(type: unknown): boolean {
  if (typeof type === "string") {
    return /JobPosting$/i.test(type);
  }
  if (Array.isArray(type)) {
    return type.some((t) => typeof t === "string" && /JobPosting$/i.test(t));
  }
  return false;
}

interface JsonLdAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

interface JsonLdPosting {
  "@type"?: unknown;
  title?: string;
  description?: string;
  hiringOrganization?: string | { name?: string };
  publisher?: string | { name?: string };
  jobLocation?: string | { address?: string | JsonLdAddress };
  "@graph"?: JsonLdPosting[];
}

function extractJsonLd(doc: Document): Partial<ExtractedJob> | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "") as JsonLdPosting | JsonLdPosting[];
      let posting: JsonLdPosting | null = null;
      if (Array.isArray(data)) {
        posting = data.find((item) => item && isJobPostingType(item["@type"])) ?? null;
      } else if (data && isJobPostingType(data["@type"])) {
        posting = data;
      } else if (Array.isArray(data?.["@graph"])) {
        posting = data["@graph"].find((item) => item && isJobPostingType(item["@type"])) ?? null;
      }

      if (posting) {
        const desc = cleanHtmlToText(posting.description || "");

        let company = "";
        if (typeof posting.hiringOrganization === "object" && posting.hiringOrganization !== null) {
          company = posting.hiringOrganization.name || "";
        } else if (typeof posting.hiringOrganization === "string") {
          company = posting.hiringOrganization;
        }

        if (!company && posting.publisher) {
          company =
            typeof posting.publisher === "object" ? posting.publisher.name || "" : posting.publisher;
        }

        let location = "";
        if (posting.jobLocation) {
          if (typeof posting.jobLocation === "string") {
            location = posting.jobLocation;
          } else if (typeof posting.jobLocation.address === "string") {
            location = posting.jobLocation.address;
          } else if (typeof posting.jobLocation.address === "object" && posting.jobLocation.address) {
            const addr = posting.jobLocation.address;
            location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
              .filter(Boolean)
              .join(", ");
          }
        }

        return {
          title: posting.title || "",
          company,
          location: location || undefined,
          description: desc,
          atsType: "other",
        };
      }
    } catch {
      // Ignore JSON parse errors in script tags
    }
  }
  return null;
}

export const extractGeneric: ExtractorFn = (doc, pageUrl = "") => {
  const jsonLd = extractJsonLd(doc);

  // 1. Title detection
  let title = jsonLd?.title || doc.querySelector("h1")?.textContent?.trim() || "";
  if (!title && doc.title) {
    const atMatch = doc.title.match(/^(.*?)\s+at\s+([A-Za-z0-9&.\- ]+?)(?:\s*\(|\s*[-–—|]|\s*$)/i);
    if (atMatch?.[1]) {
      title = atMatch[1].trim();
    } else {
      title = doc.title.split(/[-–—|]/)[0]?.trim() || "";
    }
  }

  // 2. Company detection
  let company = jsonLd?.company || "";

  // Strategy A: "at <Company>" in title (e.g. "Software Engineer at Ramp" or "Growth at Ramp (Remote)")
  if (!company) {
    const rawTitleStr = doc.title || title;
    const atMatch = rawTitleStr.match(/\bat\s+([A-Za-z0-9&.\- ]+?)(?:\s*\(|\s*[-–—|]|\s*$)/i);
    if (atMatch?.[1]) {
      company = atMatch[1].trim();
    }
  }

  // Strategy B: DOM selectors
  if (!company) {
    const companyEl =
      doc.querySelector("[class*='company-name' i]") ||
      doc.querySelector("[class*='companyName' i]") ||
      doc.querySelector("a[href*='/companies/']") ||
      doc.querySelector("a[href*='/company/']") ||
      doc.querySelector("[class*='company' i]") ||
      doc.querySelector("[data-testid*='company' i]") ||
      doc.querySelector("[rel='author']") ||
      doc.querySelector(".employer");
    if (companyEl) {
      const text = companyEl.textContent?.trim() || "";
      if (text.length > 0 && text.length < 50 && !text.includes("\n")) {
        company = text.replace(/^by\s+/i, "").replace(/^at\s+/i, "").trim();
      }
    }
  }

  // Strategy C: meta author or OpenGraph site_name
  if (!company) {
    const metaAuthor = doc.querySelector("meta[property='article:author'], meta[name='author']")?.getAttribute("content");
    if (metaAuthor && metaAuthor.length < 50) {
      company = metaAuthor.trim();
    }
  }

  if (!company) {
    const ogSite = doc.querySelector("meta[property='og:site_name']")?.getAttribute("content");
    if (ogSite && ogSite.length < 40) {
      company = ogSite.trim();
    }
  }

  // 3. Location detection
  let location: string | undefined = jsonLd?.location;
  if (!location) {
    const locEl =
      doc.querySelector("[class*='location' i]") ||
      doc.querySelector("[data-testid*='location' i]");
    if (locEl && (locEl.textContent?.length ?? 0) < 60) {
      location = locEl.textContent?.trim() || undefined;
    }
  }

  // 4. Description detection
  let description = jsonLd?.description && jsonLd.description.length > 50 ? cleanText(jsonLd.description) : "";

  if (!description) {
    const contentEl =
      doc.querySelector("[class*='job-content' i]") ||
      doc.querySelector("[class*='job-description' i]") ||
      doc.querySelector("[class*='jobDescription' i]") ||
      doc.querySelector("[id*='job-description' i]") ||
      doc.querySelector("[class*='description' i]") ||
      doc.querySelector("[class*='job-body' i]") ||
      doc.querySelector("main") ||
      doc.querySelector("article") ||
      doc.querySelector("[role='main']");

    if (contentEl) {
      const clone = contentEl.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("script, style, nav, footer, header, noscript, aside, form").forEach((el) => el.remove());
      description = cleanText(clone.innerText || clone.textContent || "");
    }
  }

  // Fallback: search for the largest readable block of text in the body
  if (!description || description.length < 50) {
    let bestBlock = "";
    const blocks = doc.querySelectorAll("div, section, article");
    for (const b of blocks) {
      const text = (b as HTMLElement).innerText || b.textContent || "";
      if (text.length > bestBlock.length) {
        bestBlock = text;
      }
    }
    description = cleanText(bestBlock);
  }

  return {
    title,
    company,
    location,
    description,
    url: pageUrl,
    atsType: "other",
  };
};

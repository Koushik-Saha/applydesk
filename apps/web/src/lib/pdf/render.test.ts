import { describe, it, expect } from "vitest";
import { getDocumentProxy, extractTextItems } from "unpdf";
import { renderResumePdf, renderCoverLetterPdf } from "./render";
import type { ResumeContent, CoverLetterContent } from "@applydesk/shared";

describe("PDF renderers", () => {
  const mockResumeContent: ResumeContent = {
    contactFullName: "Koushik Saha",
    contactEmail: "koushik@example.com",
    contactPhone: "+1 (555) 012-3456",
    contactLocation: "San Francisco, CA",
    contactLinkedin: "linkedin.com/in/koushiksaha",
    contactGithub: "github.com/koushik",
    summary: "Experienced software engineer specializing in web applications and distributed systems.",
    experiences: [
      {
        id: "exp-1",
        title: "Senior Full Stack Engineer",
        company: "Acme Corp",
        location: "Remote",
        startDate: "2022",
        endDate: "Present",
        current: true,
        summarized: false,
        bullets: [
          {
            sourceBulletIds: ["bullet-1"],
            text: "Designed and built high-performance backend microservices using Node.js and TypeScript.",
            originalKept: false,
            lintWarnings: [],
          },
        ],
      },
    ],
    projects: [
      {
        id: "proj-1",
        name: "OpenSource UI Kit",
        description: "React + TypeScript component library used by 12+ companies.",
        startDate: "2023",
        endDate: "Present",
      },
    ],
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    skillGroups: [
      { category: "Languages", skills: ["TypeScript"] },
      { category: "Frontend", skills: ["React"] },
      { category: "Backend & Data", skills: ["Node.js", "PostgreSQL"] },
    ],
    education: [
      {
        id: "edu-1",
        school: "State University",
        degree: "B.S. in Computer Science",
        startDate: "2016",
        endDate: "2020",
      },
    ],
    certifications: [{ id: "cert-1", name: "AWS Certified Solutions Architect", issuer: "AWS", date: "2025" }],
    publications: [{ id: "pub-1", title: "Scaling Micro-Frontends", publisher: "Engineering Blog", date: "2024" }],
    keywordCoverage: { before: 50, after: 85, foundAfter: ["TypeScript", "Node.js"], missingAfter: [] },
  };

  const mockCoverLetterContent: CoverLetterContent = {
    greeting: "Dear Hiring Team,",
    paragraphs: [
      "I am writing to express my strong enthusiasm for the Senior Software Engineer position.",
      "With over five years of experience building resilient cloud applications in TypeScript and React, I have consistently delivered robust services.",
      "Thank you for your consideration, and I look forward to discussing how my experience aligns with your goals.",
    ],
    signOff: "Sincerely,\nKoushik Saha",
    referencedBulletIds: ["bullet-1"],
    originalKept: false,
  };

  it("renders Resume PDF to a non-empty buffer", async () => {
    const buffer = await renderResumePdf(mockResumeContent);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
    // Standard PDF header signature %PDF-
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders Cover Letter PDF to a non-empty buffer", async () => {
    const buffer = await renderCoverLetterPdf(mockCoverLetterContent, {
      candidate: {
        fullName: "Koushik Saha",
        email: "koushik@example.com",
        location: "San Francisco, CA",
      },
      company: "Acme Corp",
      date: "September 22, 2026",
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  // Regression test for a real bug: @react-pdf/renderer's default
  // compress:true path produces a content stream with a mismatched
  // declared length / invalid zlib header (fixed via the pnpm patch at
  // patches/@react-pdf__renderer@4.9.0.patch). A parser choking on that
  // corrupted stream is exactly what showed up as blank pages in strict
  // readers and overlapping/garbled text in lenient ones. Decoding with an
  // independent parser (unpdf/pdf.js) catches a regression either way.
  it("produces a resume PDF whose content stream decodes cleanly and in order", async () => {
    const buffer = await renderResumePdf(mockResumeContent);
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    expect(doc.numPages).toBe(1);

    const { items } = await extractTextItems(new Uint8Array(buffer));
    const text = items[0]?.map((item) => item.str).join(" ") ?? "";
    expect(text).toContain("Koushik Saha");
    expect(text).toContain("Senior Full Stack Engineer");
    expect(text).toContain("high-performance backend microservices");
  });

  // Regression test for a real bug: Projects, Certifications, and
  // Publications were entirely absent from every generated resume — the
  // schema/assembly/template never carried them, even though DESIGN.md §11
  // lists them as expected sections and the profile has real data for all
  // three. Skills also rendered as one flat, uncategorized wall of text
  // instead of the profile's own category grouping.
  it("includes projects, certifications, publications, and category-grouped skills", async () => {
    const buffer = await renderResumePdf(mockResumeContent);
    const { items } = await extractTextItems(new Uint8Array(buffer));
    const text = items[0]?.map((item) => item.str).join(" ") ?? "";

    // Section headings render uppercase (styles.sectionHeading's
    // textTransform), so the actual text content is e.g. "PROJECTS".
    expect(text).toContain("PROJECTS");
    expect(text).toContain("OpenSource UI Kit");
    expect(text).toContain("CERTIFICATIONS");
    expect(text).toContain("AWS Certified Solutions Architect");
    expect(text).toContain("PUBLICATIONS");
    expect(text).toContain("Scaling Micro-Frontends");
    // Category labels from skillGroups, not just a flat comma list.
    expect(text).toContain("Languages");
    expect(text).toContain("Backend & Data");
  });

  // A tailored selection can run to several full roles with 4 bullets each
  // — this is the exact shape that used to overflow to 2 pages. The
  // auto-shrink tiers in render.ts must bring it back to 1 without losing
  // any content.
  it("keeps a resume with several full roles to one page via auto-shrink", async () => {
    const denseBullets = Array.from({ length: 4 }, (_, i) => ({
      sourceBulletIds: [`b${i}`],
      text: "Designed and shipped a full-stack real-time feature using React, Next.js, Node.js and Python/Flask, integrating third-party APIs and improving system reliability at scale.",
      originalKept: false,
      lintWarnings: [],
    }));
    const denseContent: ResumeContent = {
      ...mockResumeContent,
      experiences: [
        { id: "e1", title: "Lead Software Engineer", company: "Freedom Shopping LLC", location: "Remote", startDate: "May 2025", endDate: undefined, current: true, summarized: false, bullets: denseBullets },
        { id: "e2", title: "Senior Full-Stack Software Engineer", company: "Powerley", location: "Remote", startDate: "Jan 2023", endDate: "May 2025", current: false, summarized: false, bullets: denseBullets },
        { id: "e3", title: "Software Engineer", company: "Codemen Solutions Inc.", location: "Remote", startDate: "May 2021", endDate: "Dec 2022", current: false, summarized: false, bullets: denseBullets },
        { id: "e4", title: "Junior Software Engineer", company: "MoveOn Cross-Border Trade", location: "Remote", startDate: "Jul 2019", endDate: "May 2021", current: false, summarized: true, bullets: [] },
        { id: "e5", title: "Junior Software Engineer", company: "BD SOFT IT", location: "Remote", startDate: "Jun 2018", endDate: "Jul 2019", current: false, summarized: true, bullets: [] },
      ],
    };

    const buffer = await renderResumePdf(denseContent);
    const doc = await getDocumentProxy(new Uint8Array(buffer));
    expect(doc.numPages).toBe(1);

    const { items } = await extractTextItems(new Uint8Array(buffer));
    const text = items[0]?.map((item) => item.str).join(" ") ?? "";
    // All 5 roles must still be present — auto-shrink must never drop content.
    expect(text).toContain("Freedom Shopping LLC");
    expect(text).toContain("Powerley");
    expect(text).toContain("Codemen Solutions Inc.");
    expect(text).toContain("MoveOn Cross-Border Trade");
    expect(text).toContain("BD SOFT IT");
  });

  // Regression test for a real, visually-confirmed bug: the name's large
  // font size left too little space before the contact line, rendering it
  // overlapping the name's descender. Verified fixed by rasterizing with an
  // independent renderer (poppler); this coordinate check catches a
  // regression without needing a human to look at a screenshot each time.
  it("leaves a real vertical gap between the name and the contact line", async () => {
    const buffer = await renderResumePdf(mockResumeContent);
    const { items } = await extractTextItems(new Uint8Array(buffer));
    const page = items[0] ?? [];
    const name = page.find((item) => item.str === "Koushik Saha");
    const contact = page.find((item) => item.str?.includes("San Francisco"));
    expect(name).toBeDefined();
    expect(contact).toBeDefined();
    // Observed gap on a known-good render is ~19pt; a collapsed/overlapping
    // layout puts these within a couple of points of each other.
    expect(name!.y - contact!.y).toBeGreaterThan(14);
  });

  // Regression test for a real, visually-confirmed bug: a long publication
  // title wrapping to a second line pushed the right-aligned date down to
  // overlap that wrapped line, since the title had no reserved column width
  // (see entryTitleLine's flex: 1 in resume-pdf.tsx).
  it("keeps a wrapped publication title's date aligned to the first line, not the wrapped one", async () => {
    const content: ResumeContent = {
      ...mockResumeContent,
      publications: [
        {
          id: "pub-1",
          title:
            "Integrating Artificial Intelligence with a Global Atlas of Human Genetic Variation: Implications for Precision Medicine",
          publisher: "Journal of Multidisciplinary Healthcare",
          date: "2026",
        },
      ],
    };
    const buffer = await renderResumePdf(content);
    const { items } = await extractTextItems(new Uint8Array(buffer));
    const page = items[0] ?? [];

    const titleLine1 = page.find((item) => item.str?.startsWith("Integrating Artificial Intelligence"));
    const titleLine2 = page.find((item) => item.str?.startsWith("Precision Medicine"));
    const date = page.find((item) => item.str === "2026");
    expect(titleLine1).toBeDefined();
    expect(titleLine2).toBeDefined();
    expect(date).toBeDefined();

    // The date must sit with the title's first line, not drift down onto
    // the wrapped second line.
    const distanceToFirstLine = Math.abs(date!.y - titleLine1!.y);
    const distanceToWrappedLine = Math.abs(date!.y - titleLine2!.y);
    expect(distanceToFirstLine).toBeLessThan(distanceToWrappedLine);
  });
});

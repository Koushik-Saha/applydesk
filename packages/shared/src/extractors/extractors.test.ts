import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { extractJob } from "./index";

function loadFixture(filename: string, url: string): Document {
  const filePath = resolve(__dirname, "../../../../fixtures/postings", filename);
  const html = readFileSync(filePath, "utf-8");
  const dom = new JSDOM(html, { url });
  return dom.window.document;
}

describe("job extractors against fixtures", () => {
  it("extracts greenhouse postings", () => {
    const doc = loadFixture("greenhouse.html", "https://boards.greenhouse.io/stripe/jobs/123");
    const job = extractJob(doc, { url: "https://boards.greenhouse.io/stripe/jobs/123" });

    expect(job.atsType).toBe("greenhouse");
    expect(job.title).toBe("Senior Frontend Engineer");
    expect(job.company).toBe("Stripe");
    expect(job.location).toContain("San Francisco");
    expect(job.description).toContain("React and TypeScript");
  });

  it("extracts lever postings", () => {
    const doc = loadFixture("lever.html", "https://jobs.lever.co/figma/abc-123");
    const job = extractJob(doc, { url: "https://jobs.lever.co/figma/abc-123" });

    expect(job.atsType).toBe("lever");
    expect(job.title).toBe("Full Stack Engineer");
    expect(job.company.toLowerCase()).toBe("figma");
    expect(job.location).toContain("San Francisco");
    expect(job.description).toContain("TypeScript, React, and Rust");
  });

  it("extracts ashby postings", () => {
    const doc = loadFixture("ashby.html", "https://jobs.ashbyhq.com/vercel/def-456");
    const job = extractJob(doc, { url: "https://jobs.ashbyhq.com/vercel/def-456" });

    expect(job.atsType).toBe("ashby");
    expect(job.title).toBe("Staff Product Engineer");
    expect(job.company.toLowerCase()).toBe("vercel");
    expect(job.location).toContain("Remote, US");
    expect(job.description).toContain("Next.js");
  });

  it("extracts linkedin postings", () => {
    const doc = loadFixture("linkedin.html", "https://www.linkedin.com/jobs/view/123456789");
    const job = extractJob(doc, { url: "https://www.linkedin.com/jobs/view/123456789" });

    expect(job.atsType).toBe("linkedin");
    expect(job.title).toBe("Lead Mobile Engineer");
    expect(job.company).toBe("Airbnb");
    expect(job.location).toContain("San Francisco");
    expect(job.description).toContain("React Native");
  });

  it("extracts indeed postings", () => {
    const doc = loadFixture("indeed.html", "https://www.indeed.com/viewjob?jk=abcdef");
    const job = extractJob(doc, { url: "https://www.indeed.com/viewjob?jk=abcdef" });

    expect(job.atsType).toBe("indeed");
    expect(job.title).toBe("Senior Software Engineer");
    expect(job.company).toBe("Datadog");
    expect(job.location).toContain("New York, NY");
    expect(job.description).toContain("monitoring and security platform");
  });

  it("extracts workday postings", () => {
    const doc = loadFixture("workday.html", "https://target.wd5.myworkdayjobs.com/target_careers/job/123");
    const job = extractJob(doc, { url: "https://target.wd5.myworkdayjobs.com/target_careers/job/123" });

    expect(job.atsType).toBe("workday");
    expect(job.title).toBe("Principal Backend Engineer");
    expect(job.company).toBe("Target");
    expect(job.location).toContain("Seattle, WA");
    expect(job.description).toContain("Java/Go");
  });

  it("extracts generic / RemoteOnly posting with JSON-LD and title company heuristic", () => {
    const doc = loadFixture("generic.html", "https://remoteonly.io/remote-jobs/software-engineer-frontend-growth-ramp-e00ab353");
    const job = extractJob(doc, { url: "https://remoteonly.io/remote-jobs/software-engineer-frontend-growth-ramp-e00ab353" });

    expect(job.atsType).toBe("other");
    expect(job.title).toBe("Software Engineer, Frontend, Growth");
    expect(job.company).toBe("Ramp");
    expect(job.description).toContain("smart infrastructure for finance teams");
  });

  it("uses highlighted text when provided", () => {
    const doc = loadFixture("generic.html", "https://example.com/job");
    const highlighted = "Custom highlighted job requirements: MUST KNOW REACT AND DRIZZLE ORM.";
    const job = extractJob(doc, { url: "https://example.com/job", selection: highlighted });

    expect(job.description).toBe(highlighted);
  });
});

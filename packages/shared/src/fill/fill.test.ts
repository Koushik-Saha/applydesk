import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { emptyStandardAnswers, type StandardAnswers } from "../schemas/standard-answers";
import { matchFields } from "./field-matcher";
import { attachFiles, fillFields } from "./orchestrate";

function loadFixture(atsDir: string, url: string): { doc: Document; window: JSDOM["window"] } {
  const filePath = resolve(__dirname, "../../../../fixtures/ats", atsDir, "form.html");
  const html = readFileSync(filePath, "utf-8");
  const dom = new JSDOM(html, { url });
  return { doc: dom.window.document, window: dom.window };
}

function sampleAnswers(): StandardAnswers {
  return {
    ...emptyStandardAnswers(),
    legalName: "Jamie Rivera",
    email: "jamie@example.com",
    phone: "555-123-4567",
    linkedin: "https://linkedin.com/in/jamie",
    github: "https://github.com/jamie",
    portfolio: "https://jamie.dev",
    cityState: "Austin, TX",
  };
}

describe("fillFields against ATS fixtures", () => {
  it("fills the split first/last name and known fields on Greenhouse", () => {
    const { doc } = loadFixture("greenhouse", "https://boards.greenhouse.io/stripe/jobs/123");
    const results = fillFields(doc, sampleAnswers());

    expect((doc.querySelector("#first_name") as HTMLInputElement).value).toBe("Jamie");
    expect((doc.querySelector("#last_name") as HTMLInputElement).value).toBe("Rivera");
    expect((doc.querySelector("#email") as HTMLInputElement).value).toBe("jamie@example.com");
    expect((doc.querySelector("#phone") as HTMLInputElement).value).toBe("555-123-4567");
    expect((doc.querySelector("#question_linkedin") as HTMLInputElement).value).toBe(
      "https://linkedin.com/in/jamie",
    );

    // Never fills free-text essay questions.
    expect((doc.querySelector("#question_essay") as HTMLTextAreaElement).value).toBe("");
    // EEO fields are filled with the configured default ("Decline to
    // answer") rather than guessed — never Male/Female.
    const genderSelect = doc.querySelector("#question_gender") as HTMLSelectElement;
    expect(genderSelect.value).toBe("Decline to answer");
    const genderResult = results.find((r) => r.label === "gender");
    expect(genderResult?.status).toBe("filled");
  });

  it("dispatches input/change events so controlled forms observe the fill", () => {
    const { doc } = loadFixture("greenhouse", "https://boards.greenhouse.io/stripe/jobs/123");
    const input = doc.querySelector("#email") as HTMLInputElement;
    const onInput = vi.fn();
    const onChange = vi.fn();
    input.addEventListener("input", onInput);
    input.addEventListener("change", onChange);

    fillFields(doc, sampleAnswers());

    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("fills the single name field and social links on Lever", () => {
    const { doc } = loadFixture("lever", "https://jobs.lever.co/figma/abc-123");
    fillFields(doc, sampleAnswers());

    expect((doc.querySelector("#name-input") as HTMLInputElement).value).toBe("Jamie Rivera");
    expect((doc.querySelector("#email-input") as HTMLInputElement).value).toBe("jamie@example.com");
    expect((doc.querySelector('input[name="urls[LinkedIn]"]') as HTMLInputElement).value).toBe(
      "https://linkedin.com/in/jamie",
    );
    // Never fills free-text additional info.
    expect((doc.querySelector("#additional-info") as HTMLTextAreaElement).value).toBe("");
  });

  it("fills Ashby's prefixed system fields", () => {
    const { doc } = loadFixture("ashby", "https://jobs.ashbyhq.com/vercel/def-456");
    fillFields(doc, sampleAnswers());

    expect((doc.querySelector("#af-name") as HTMLInputElement).value).toBe("Jamie Rivera");
    expect((doc.querySelector("#af-email") as HTMLInputElement).value).toBe("jamie@example.com");
    expect((doc.querySelector("#af-location") as HTMLInputElement).value).toBe("Austin, TX");
    // Falls back to generic matching for fields the adapter doesn't cover.
    expect((doc.querySelector("#af-website") as HTMLInputElement).value).toBe("https://jamie.dev");
  });

  it("never touches submit buttons", () => {
    for (const [ats, url] of [
      ["greenhouse", "https://boards.greenhouse.io/stripe/jobs/123"],
      ["lever", "https://jobs.lever.co/figma/abc-123"],
      ["ashby", "https://jobs.ashbyhq.com/vercel/def-456"],
    ] as const) {
      const { doc } = loadFixture(ats, url);
      const submit = doc.querySelector('button[type="submit"]') as HTMLButtonElement;
      const clickSpy = vi.fn();
      submit.addEventListener("click", clickSpy);

      fillFields(doc, sampleAnswers());
      attachFiles(doc, {
        resumeBytes: new ArrayBuffer(8),
        coverLetterBytes: new ArrayBuffer(8),
        resumeFilename: "resume.pdf",
        coverLetterFilename: "cover-letter.pdf",
      });

      expect(clickSpy).not.toHaveBeenCalled();
    }
  });
});

describe("attachFiles against ATS fixtures", () => {
  it("attaches the resume and cover letter on Greenhouse via DataTransfer", () => {
    const { doc } = loadFixture("greenhouse", "https://boards.greenhouse.io/stripe/jobs/123");
    const results = attachFiles(doc, {
      resumeBytes: new ArrayBuffer(8),
      coverLetterBytes: new ArrayBuffer(8),
      resumeFilename: "jamie-resume.pdf",
      coverLetterFilename: "jamie-cover-letter.pdf",
    });

    const resumeInput = doc.querySelector("#resume") as HTMLInputElement;
    const coverInput = doc.querySelector("#cover_letter") as HTMLInputElement;
    expect(resumeInput.files?.[0]?.name).toBe("jamie-resume.pdf");
    expect(coverInput.files?.[0]?.name).toBe("jamie-cover-letter.pdf");
    expect(results.every((r) => r.status === "attached")).toBe(true);
  });

  it("reports needs-you when Lever has no cover-letter input", () => {
    const { doc } = loadFixture("lever", "https://jobs.lever.co/figma/abc-123");
    const results = attachFiles(doc, {
      resumeBytes: new ArrayBuffer(8),
      coverLetterBytes: new ArrayBuffer(8),
      resumeFilename: "resume.pdf",
      coverLetterFilename: "cover-letter.pdf",
    });

    const resumeInput = doc.querySelector("#resume-upload-input") as HTMLInputElement;
    expect(resumeInput.files?.[0]?.name).toBe("resume.pdf");

    const coverResult = results.find((r) => r.label === "Cover letter");
    expect(coverResult?.status).toBe("needs_you");
  });
});

describe("matchFields", () => {
  it("never matches textarea elements (free-text essays)", () => {
    const dom = new JSDOM(
      `<textarea id="essay" name="essay" aria-label="Why do you want this job"></textarea>`,
    );
    const matches = matchFields(dom.window.document);
    expect(matches).toHaveLength(0);
  });

  it("claims each answer key at most once", () => {
    const dom = new JSDOM(
      `<input id="email1" name="email" /><input id="email2" name="email_confirm" />`,
    );
    const matches = matchFields(dom.window.document);
    expect(matches.filter((m) => m.answerKey === "email")).toHaveLength(1);
  });
});

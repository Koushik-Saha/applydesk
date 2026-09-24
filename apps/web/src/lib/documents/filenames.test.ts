import { describe, expect, it } from "vitest";
import { coverLetterFileName, resumeFileName } from "./filenames";

describe("resumeFileName", () => {
  it("joins the sanitized name and company", () => {
    expect(resumeFileName("Koushik Saha", "Acme Corp")).toBe("Koushik_Saha_Resume_Acme_Corp.pdf");
  });

  it("strips punctuation from the company name", () => {
    expect(resumeFileName("Koushik Saha", "Acme, Inc.")).toBe("Koushik_Saha_Resume_Acme_Inc.pdf");
  });

  it("collapses repeated separators", () => {
    expect(resumeFileName("Koushik  Saha", "Acme -- Corp")).toBe("Koushik_Saha_Resume_Acme_Corp.pdf");
  });

  it("trims leading/trailing punctuation", () => {
    expect(resumeFileName("Koushik Saha", "(Acme Corp)")).toBe("Koushik_Saha_Resume_Acme_Corp.pdf");
  });
});

describe("coverLetterFileName", () => {
  it("joins the sanitized name and company", () => {
    expect(coverLetterFileName("Koushik Saha", "Acme Corp")).toBe("Koushik_Saha_Cover_Letter_Acme_Corp.pdf");
  });
});

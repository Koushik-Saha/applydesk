import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StandardAnswers, FillResultEntry } from "@applydesk/shared";

// PROJECT_SPEC.md §5 / Prompt 12 step 5 — loads the *built* extension in a
// real Chromium against saved ATS application-form fixtures and asserts
// fields get filled, files get attached, and — the hard rule — submit is
// never clicked. This exercises the real browser's DataTransfer/native
// setters, which jsdom (used by packages/shared/src/fill/fill.test.ts) only
// approximates.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../.output/chrome-mv3");
const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/ats");

const SAMPLE_ANSWERS: StandardAnswers = {
  legalName: "Jamie Rivera",
  email: "jamie@example.com",
  phone: "555-123-4567",
  cityState: "Austin, TX",
  linkedin: "https://linkedin.com/in/jamie",
  github: "https://github.com/jamie",
  portfolio: "https://jamie.dev",
  sponsorshipNeeded: false,
  willingToRelocate: false,
  eeo: {
    gender: "Decline to answer",
    race: "Decline to answer",
    veteranStatus: "Decline to answer",
    disabilityStatus: "Decline to answer",
  },
};

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext("", {
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  });
});

test.afterAll(async () => {
  await context.close();
});

async function openFixtureAndFill(
  ats: string,
  resumeFilename: string,
  coverLetterFilename: string,
): Promise<{ page: Page; results: FillResultEntry[] }> {
  const page = await context.newPage();
  await page.goto(`file://${path.join(FIXTURES_DIR, ats, "form.html")}`);

  // Guards the hard rule: never click submit/next/continue.
  await page.evaluate(() => {
    (window as unknown as { __submitClicked: boolean }).__submitClicked = false;
    document.querySelector('button[type="submit"]')?.addEventListener("click", () => {
      (window as unknown as { __submitClicked: boolean }).__submitClicked = true;
    });
  });

  // Loads the fill engine exactly as
  // chrome.scripting.executeScript({ files: ["/apply-fill.js"] }) would.
  await page.addScriptTag({ path: path.join(EXTENSION_PATH, "apply-fill.js") });

  const results = await page.evaluate(
    ({ answers, resumeFilename, coverLetterFilename }) => {
      const w = window as unknown as {
        __applydeskFill: (
          answers: StandardAnswers,
          attach: unknown,
          options: unknown,
        ) => FillResultEntry[];
      };
      return w.__applydeskFill(
        answers,
        {
          resumeBytes: new Uint8Array([1, 2, 3, 4]).buffer,
          coverLetterBytes: new Uint8Array([5, 6, 7, 8]).buffer,
          resumeFilename,
          coverLetterFilename,
        },
        { fillFields: true, attachFiles: true },
      );
    },
    { answers: SAMPLE_ANSWERS, resumeFilename, coverLetterFilename },
  );

  return { page, results };
}

test("fills the split name and attaches both files on the Greenhouse fixture", async () => {
  const { page, results } = await openFixtureAndFill(
    "greenhouse",
    "jamie-resume.pdf",
    "jamie-cover-letter.pdf",
  );

  await expect(page.locator("#first_name")).toHaveValue("Jamie");
  await expect(page.locator("#last_name")).toHaveValue("Rivera");
  await expect(page.locator("#email")).toHaveValue("jamie@example.com");
  await expect(page.locator("#phone")).toHaveValue("555-123-4567");
  await expect(page.locator("#question_essay")).toHaveValue("");

  const resumeFileName = await page.locator("#resume").evaluate((el: HTMLInputElement) => el.files?.[0]?.name);
  const coverFileName = await page
    .locator("#cover_letter")
    .evaluate((el: HTMLInputElement) => el.files?.[0]?.name);
  expect(resumeFileName).toBe("jamie-resume.pdf");
  expect(coverFileName).toBe("jamie-cover-letter.pdf");

  expect(results.some((r) => r.status === "attached")).toBe(true);

  const submitClicked = await page.evaluate(
    () => (window as unknown as { __submitClicked: boolean }).__submitClicked,
  );
  expect(submitClicked).toBe(false);

  await page.close();
});

test("fills the single name field on the Lever fixture and reports needs-you for the missing cover-letter input", async () => {
  const { page, results } = await openFixtureAndFill("lever", "resume.pdf", "cover-letter.pdf");

  await expect(page.locator("#name-input")).toHaveValue("Jamie Rivera");
  await expect(page.locator("#email-input")).toHaveValue("jamie@example.com");
  await expect(page.locator('input[name="urls[LinkedIn]"]')).toHaveValue("https://linkedin.com/in/jamie");
  await expect(page.locator("#additional-info")).toHaveValue("");

  const resumeFileName = await page
    .locator("#resume-upload-input")
    .evaluate((el: HTMLInputElement) => el.files?.[0]?.name);
  expect(resumeFileName).toBe("resume.pdf");

  const coverResult = results.find((r) => r.label === "Cover letter");
  expect(coverResult?.status).toBe("needs_you");

  const submitClicked = await page.evaluate(
    () => (window as unknown as { __submitClicked: boolean }).__submitClicked,
  );
  expect(submitClicked).toBe(false);

  await page.close();
});

test("fills Ashby's prefixed system fields and never clicks submit", async () => {
  const { page } = await openFixtureAndFill("ashby", "resume.pdf", "cover-letter.pdf");

  await expect(page.locator("#af-name")).toHaveValue("Jamie Rivera");
  await expect(page.locator("#af-email")).toHaveValue("jamie@example.com");
  await expect(page.locator("#af-location")).toHaveValue("Austin, TX");
  await expect(page.locator("#af-website")).toHaveValue("https://jamie.dev");

  const resumeFileName = await page
    .locator("#af-resume")
    .evaluate((el: HTMLInputElement) => el.files?.[0]?.name);
  expect(resumeFileName).toBe("resume.pdf");

  const submitClicked = await page.evaluate(
    () => (window as unknown as { __submitClicked: boolean }).__submitClicked,
  );
  expect(submitClicked).toBe(false);

  await page.close();
});

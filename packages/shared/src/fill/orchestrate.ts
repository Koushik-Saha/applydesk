import type { StandardAnswers } from "../schemas/standard-answers";
import { matchFields } from "./field-matcher";
import { fillFieldValue } from "./set-value";
import { buildPdfFile, findFileInputs, setFileOnInput } from "./attach-files";
import { greenhouseAdapter } from "./adapters/greenhouse";
import { leverAdapter } from "./adapters/lever";
import { ashbyAdapter } from "./adapters/ashby";
import type { AnswerKey, AtsAdapter, FillOptions, FillResultEntry } from "./types";

const ADAPTERS: AtsAdapter[] = [greenhouseAdapter, leverAdapter, ashbyAdapter];

// EEO/free-text fields are never guessed at by the generic matcher unless a
// real answer was configured; skip essay/textarea inputs entirely.
// PROJECT_SPEC.md §5.2 "never fill" rules.
function labelForKey(key: AnswerKey): string {
  return key.startsWith("eeo.") ? key.slice(4) : key;
}

/**
 * Fills recognized form fields on `doc` using `answers`, preferring the
 * matching ATS adapter's known selectors and falling back to generic
 * label/name/autocomplete matching for anything the adapter doesn't cover.
 * Never clicks anything — the caller is responsible for review + submit.
 */
export function fillFields(doc: Document, answers: StandardAnswers): FillResultEntry[] {
  const results: FillResultEntry[] = [];
  const claimed = new Set<Element>();
  const filledKeys = new Set<AnswerKey>();

  const adapter = ADAPTERS.find((a) => a.detect(doc));

  if (adapter?.splitNameSelectors && answers.legalName) {
    const first = doc.querySelector<HTMLInputElement>(adapter.splitNameSelectors.first);
    const last = doc.querySelector<HTMLInputElement>(adapter.splitNameSelectors.last);
    const [firstName, ...rest] = answers.legalName.trim().split(/\s+/);
    if (first && firstName) {
      fillFieldValue(first, "legalName", { ...answers, legalName: firstName });
      claimed.add(first);
    }
    if (last && rest.length) {
      fillFieldValue(last, "legalName", { ...answers, legalName: rest.join(" ") });
      claimed.add(last);
    }
    if (first || last) {
      results.push({ status: "filled", label: "Full name" });
      filledKeys.add("legalName");
    }
  }

  if (adapter) {
    for (const [key, selector] of Object.entries(adapter.fieldSelectors) as Array<
      [AnswerKey, string]
    >) {
      if (filledKeys.has(key)) continue;
      const field = doc.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
      if (!field) continue;
      const ok = fillFieldValue(field, key, answers);
      claimed.add(field);
      filledKeys.add(key);
      results.push({
        status: ok ? "filled" : "needs_you",
        label: labelForKey(key),
        reason: ok ? undefined : "No answer set for this field",
      });
    }
  }

  for (const match of matchFields(doc)) {
    if (claimed.has(match.field) || filledKeys.has(match.answerKey)) continue;
    const ok = fillFieldValue(match.field, match.answerKey, answers);
    filledKeys.add(match.answerKey);
    results.push({
      status: ok ? "filled" : "needs_you",
      label: labelForKey(match.answerKey),
      reason: ok ? undefined : "No answer set for this field",
    });
  }

  return results;
}

export interface AttachInput {
  resumeBytes?: ArrayBuffer;
  coverLetterBytes?: ArrayBuffer;
  resumeFilename: string;
  coverLetterFilename: string;
}

/**
 * Attaches the resume/cover-letter PDFs to the page's file inputs.
 * PROJECT_SPEC.md §5.2 — resume goes to the resume input, cover letter to the
 * cover-letter input when one exists; otherwise it's reported as needs-you.
 */
export function attachFiles(doc: Document, input: AttachInput): FillResultEntry[] {
  const adapter = ADAPTERS.find((a) => a.detect(doc));
  const { resumeInput, coverLetterInput } = findFileInputs(doc, adapter);
  const results: FillResultEntry[] = [];

  if (input.resumeBytes) {
    if (resumeInput) {
      setFileOnInput(resumeInput, buildPdfFile(input.resumeBytes, input.resumeFilename));
      results.push({ status: "attached", label: "Resume" });
    } else {
      results.push({ status: "needs_you", label: "Resume", reason: "No resume upload field found" });
    }
  }

  if (input.coverLetterBytes) {
    if (coverLetterInput) {
      setFileOnInput(
        coverLetterInput,
        buildPdfFile(input.coverLetterBytes, input.coverLetterFilename),
      );
      results.push({ status: "attached", label: "Cover letter" });
    } else {
      results.push({
        status: "needs_you",
        label: "Cover letter",
        reason: "No cover-letter upload field found",
      });
    }
  }

  return results;
}

export function runFill(
  doc: Document,
  answers: StandardAnswers,
  attach: AttachInput,
  options: FillOptions = {},
): FillResultEntry[] {
  const { fillFields: shouldFill = true, attachFiles: shouldAttach = true } = options;
  const results: FillResultEntry[] = [];
  if (shouldFill) results.push(...fillFields(doc, answers));
  if (shouldAttach) results.push(...attachFiles(doc, attach));
  return results;
}

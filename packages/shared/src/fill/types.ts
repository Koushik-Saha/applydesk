import type { StandardAnswers } from "../schemas/standard-answers";

export type FillableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Keys of StandardAnswers that are safe to autofill (PROJECT_SPEC.md §5.2).
// EEO sub-fields are addressed as "eeo.<key>" since they nest one level.
export type AnswerKey =
  | keyof Omit<StandardAnswers, "eeo">
  | `eeo.${keyof StandardAnswers["eeo"]}`;

export interface FieldMatch {
  field: FillableField;
  answerKey: AnswerKey;
}

export type ResultStatus = "filled" | "needs_you" | "attached" | "skipped";

export interface FillResultEntry {
  status: ResultStatus;
  label: string;
  reason?: string;
}

export interface FillOptions {
  /** Fill text/select fields against standard answers. Default true. */
  fillFields?: boolean;
  /** Attach resume/cover-letter PDFs to file inputs. Default true. */
  attachFiles?: boolean;
}

export interface AtsAdapter {
  /** Returns true when this adapter's known DOM shape is present. */
  detect: (doc: Document) => boolean;
  /** Known field selectors -> StandardAnswers key. */
  fieldSelectors: Partial<Record<AnswerKey, string>>;
  /** Some ATSes split legalName into separate first/last inputs. */
  splitNameSelectors?: { first: string; last: string };
  /** Known selector for the resume file input, if any. */
  resumeInputSelector?: string;
  /** Known selector for the cover-letter file input, if any. */
  coverLetterInputSelector?: string;
}

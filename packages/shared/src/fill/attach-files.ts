import { dispatchNativeEvent } from "./set-value";

// PROJECT_SPEC.md §5.2 — fetch PDF from the site, build a File, set it on
// input[type=file] through a DataTransfer, then dispatch change. Runs inside
// the page context (not the popup), so File/DataTransfer are the page's own.
export function buildPdfFile(bytes: ArrayBuffer, filename: string): File {
  return new File([bytes], filename, { type: "application/pdf" });
}

interface DataTransferLike {
  items: { add: (file: File) => void };
  files: FileList;
}

export function setFileOnInput(input: HTMLInputElement, file: File): void {
  const win = (input.ownerDocument?.defaultView ?? globalThis) as unknown as Record<string, unknown>;
  const DataTransferCtor = win.DataTransfer as (new () => DataTransferLike) | undefined;
  if (typeof DataTransferCtor === "function") {
    const transfer = new DataTransferCtor();
    transfer.items.add(file);
    input.files = transfer.files;
  } else {
    // jsdom has no DataTransfer implementation, so tests fall back to
    // defining `files` directly. Every real browser takes the path above.
    Object.defineProperty(input, "files", { value: [file], configurable: true });
  }
  dispatchNativeEvent(input, "input");
  dispatchNativeEvent(input, "change");
}

const RESUME_HINTS = /resume|r[ée]sum[ée]|\bcv\b/i;
const COVER_LETTER_HINTS = /cover[\s-]?letter/i;

function signalFor(input: HTMLInputElement, doc: Document): string {
  const id = input.id;
  const label = id
    ? doc.querySelector(`label[for="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id}"]`)?.textContent
    : input.closest("label")?.textContent;
  return [
    input.getAttribute("name") || "",
    input.id || "",
    input.getAttribute("aria-label") || "",
    label || "",
  ]
    .join(" ")
    .trim();
}

/**
 * Finds file inputs on the page for resume and cover-letter attachment,
 * preferring adapter-known selectors and falling back to name/label sniffing.
 */
export function findFileInputs(
  doc: Document,
  known?: { resumeInputSelector?: string; coverLetterInputSelector?: string },
): { resumeInput: HTMLInputElement | null; coverLetterInput: HTMLInputElement | null } {
  const fileInputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="file"]'));

  let resumeInput: HTMLInputElement | null = null;
  let coverLetterInput: HTMLInputElement | null = null;

  if (known?.resumeInputSelector) {
    resumeInput = doc.querySelector<HTMLInputElement>(known.resumeInputSelector);
  }
  if (known?.coverLetterInputSelector) {
    coverLetterInput = doc.querySelector<HTMLInputElement>(known.coverLetterInputSelector);
  }

  for (const input of fileInputs) {
    if (resumeInput && coverLetterInput) break;
    const signal = signalFor(input, doc);
    if (!resumeInput && RESUME_HINTS.test(signal) && !COVER_LETTER_HINTS.test(signal)) {
      resumeInput = input;
    } else if (!coverLetterInput && COVER_LETTER_HINTS.test(signal)) {
      coverLetterInput = input;
    }
  }

  return { resumeInput, coverLetterInput };
}

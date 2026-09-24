// PROJECT_SPEC.md §4.8 — "Koushik_Saha_Resume_<Company>.pdf" etc. Both the
// candidate's name and the company come from user-entered text, so this
// strips anything that isn't filesystem/Drive-safe before joining with "_".
function sanitize(part: string): string {
  return part
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resumeFileName(fullName: string, company: string): string {
  return `${sanitize(fullName)}_Resume_${sanitize(company)}.pdf`;
}

export function coverLetterFileName(fullName: string, company: string): string {
  return `${sanitize(fullName)}_Cover_Letter_${sanitize(company)}.pdf`;
}

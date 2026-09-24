import type { AnswerKey, FieldMatch, FillableField } from "./types";

// PROJECT_SPEC.md §5.2 — generic fallback: match fields by autocomplete, name,
// id, label text, placeholder, aria-label against the standard answers.
// Order matters: more specific patterns (e.g. "linkedin") must be tested
// before generic ones (e.g. "name") to avoid false positives.
const RULES: Array<{ key: AnswerKey; autocomplete?: string[]; patterns: RegExp[] }> = [
  { key: "email", autocomplete: ["email"], patterns: [/e[-\s]?mail/i] },
  { key: "phone", autocomplete: ["tel"], patterns: [/phone|mobile|telephone/i] },
  { key: "linkedin", patterns: [/linked ?in/i] },
  { key: "github", patterns: [/git ?hub/i] },
  { key: "portfolio", patterns: [/portfolio|personal website|website/i] },
  {
    key: "legalName",
    autocomplete: ["name"],
    patterns: [/full name|legal name|^name$|your name/i],
  },
  { key: "preferredName", patterns: [/preferred name|nickname|goes by/i] },
  {
    key: "cityState",
    autocomplete: ["address-level2"],
    patterns: [/city.*state|location|current location|city\s*\/\s*state/i],
  },
  {
    key: "workAuthorization",
    patterns: [/work authoriz|legally authorized|authorized to work/i],
  },
  {
    key: "sponsorshipNeeded",
    patterns: [/sponsorship|require.*visa|need.*visa/i],
  },
  {
    key: "willingToRelocate",
    patterns: [/relocat/i],
  },
  { key: "noticePeriod", patterns: [/notice period|start date availability|available to start/i] },
  { key: "salaryExpectation", patterns: [/salary|compensation expectation/i] },
  { key: "yearsOfExperience", patterns: [/years of experience|years experience/i] },
  { key: "pronouns", patterns: [/pronouns/i] },
  { key: "eeo.gender", patterns: [/\bgender\b/i] },
  { key: "eeo.race", patterns: [/race|ethnicity/i] },
  { key: "eeo.veteranStatus", patterns: [/veteran/i] },
  { key: "eeo.disabilityStatus", patterns: [/disability/i] },
];

function labelTextFor(field: FillableField, doc: Document): string {
  const id = field.id;
  if (id) {
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
    const label = doc.querySelector(`label[for="${escaped}"]`);
    if (label?.textContent) return label.textContent;
  }
  const parentLabel = field.closest("label");
  if (parentLabel?.textContent) return parentLabel.textContent;
  return "";
}

function signalFor(field: FillableField, doc: Document): { text: string; autocomplete: string } {
  const autocomplete = (field.getAttribute("autocomplete") || "").toLowerCase();
  const parts = [
    field.getAttribute("name") || "",
    field.id || "",
    field.getAttribute("placeholder") || "",
    field.getAttribute("aria-label") || "",
    labelTextFor(field, doc),
  ];
  return { text: parts.join(" ").trim(), autocomplete };
}

const FILLABLE_INPUT_TYPES = new Set([
  "text",
  "email",
  "tel",
  "url",
  "number",
  "",
  null,
]);

function isCandidateField(el: Element): el is FillableField {
  if (el.tagName === "SELECT") return true;
  if (el.tagName === "INPUT") {
    return FILLABLE_INPUT_TYPES.has((el as HTMLInputElement).type);
  }
  // Textareas are deliberately excluded — spec: never fill free-text essays.
  return false;
}

/**
 * Matches visible, fillable fields in `doc` to StandardAnswers keys using
 * autocomplete/name/id/label/placeholder/aria-label signals. Each answer key
 * is matched to at most one field (first match wins) to avoid overwriting an
 * already-filled field with a worse guess.
 */
export function matchFields(doc: Document, root: ParentNode = doc): FieldMatch[] {
  const candidates = Array.from(root.querySelectorAll("input, select")).filter(isCandidateField);
  const matches: FieldMatch[] = [];
  const claimedKeys = new Set<AnswerKey>();

  for (const field of candidates) {
    const { text, autocomplete } = signalFor(field, doc);
    if (!text && !autocomplete) continue;

    for (const rule of RULES) {
      if (claimedKeys.has(rule.key)) continue;
      const autocompleteHit = rule.autocomplete?.some((token) => autocomplete.includes(token));
      const patternHit = rule.patterns.some((pattern) => pattern.test(text));
      if (autocompleteHit || patternHit) {
        matches.push({ field, answerKey: rule.key });
        claimedKeys.add(rule.key);
        break;
      }
    }
  }

  return matches;
}

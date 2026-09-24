import type { AnswerKey, FillableField } from "./types";
import type { StandardAnswers } from "../schemas/standard-answers";

function resolveAnswerValue(answers: StandardAnswers, key: AnswerKey): string | undefined {
  if (key.startsWith("eeo.")) {
    const eeoKey = key.slice(4) as keyof StandardAnswers["eeo"];
    return answers.eeo[eeoKey];
  }
  const value = answers[key as keyof Omit<StandardAnswers, "eeo">];
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function isSelect(field: FillableField): field is HTMLSelectElement {
  return field.tagName === "SELECT";
}

// Node's global `Event` is a different realm than JSDOM's, so `dispatchEvent`
// rejects it there; always construct events from the target's own window.
export function dispatchNativeEvent(target: EventTarget & { ownerDocument?: Document }, type: string) {
  const win = (target.ownerDocument?.defaultView ?? globalThis) as unknown as { Event: typeof Event };
  target.dispatchEvent(new win.Event(type, { bubbles: true }));
}

// React (and other frameworks) wrap the native value setter, so a plain
// `field.value = x` gets silently reverted. Setting through the native
// prototype setter first, then dispatching input/change, makes controlled
// forms pick up the change. PROJECT_SPEC.md §5.2.
//
// The prototype must come from the field's own window (not a global class
// reference) so this also works when the field lives in a JSDOM instance
// rather than the real browser window.
function setNativeValue(field: FillableField, value: string) {
  const win = (field.ownerDocument?.defaultView ?? globalThis) as unknown as Record<string, unknown>;
  const ctorName =
    field.tagName === "TEXTAREA"
      ? "HTMLTextAreaElement"
      : field.tagName === "SELECT"
        ? "HTMLSelectElement"
        : "HTMLInputElement";
  const ctor = win[ctorName] as { prototype: object } | undefined;
  const prototype = ctor?.prototype ?? Object.getPrototypeOf(field);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  const nativeSetter = descriptor?.set;
  if (nativeSetter) {
    nativeSetter.call(field, value);
  } else {
    field.value = value;
  }
}

/**
 * Sets `field`'s value and dispatches input/change events so React-controlled
 * forms observe the change. Returns false if the answer has no value to fill
 * (leaving the field untouched, to be reported as "needs you").
 */
export function fillFieldValue(
  field: FillableField,
  answerKey: AnswerKey,
  answers: StandardAnswers,
): boolean {
  const value = resolveAnswerValue(answers, answerKey);
  if (!value) return false;

  if (isSelect(field)) {
    const option = Array.from(field.options).find(
      (opt) => opt.value === value || opt.textContent?.trim().toLowerCase() === value.toLowerCase(),
    );
    if (!option) return false;
    setNativeValue(field, option.value);
  } else {
    setNativeValue(field, value);
  }

  dispatchNativeEvent(field, "input");
  dispatchNativeEvent(field, "change");
  return true;
}

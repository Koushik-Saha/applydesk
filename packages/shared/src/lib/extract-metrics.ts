// PROJECT_SPEC.md §4.1 — bullet.metrics[] is "numbers it contains": dollar
// amounts, percentages, and plain numbers (including a trailing "10+
// years"-style plus). Order matters so `$2.5M` and `40%` are each matched
// whole before the plain-number alternative could otherwise grab a piece of
// them.
const METRIC_PATTERN = /\$\d[\d,]*(?:\.\d+)?[kKmMbB]?\b|\d[\d,]*(?:\.\d+)?%|\d[\d,]*(?:\.\d+)?\+?/g;

export function extractMetrics(text: string): string[] {
  return [...text.matchAll(METRIC_PATTERN)].map((match) => match[0]);
}

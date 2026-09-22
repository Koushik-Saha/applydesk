function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(keywords: string[]): RegExp | null {
  const escaped = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .map(escapeRegExp)
    // longest first so e.g. "React Native" wins over "React" on overlap
    .sort((a, b) => b.length - a.length);
  if (escaped.length === 0) return null;
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
}

// DESIGN.md "Job page" — "job description rendered cleanly, with matched
// keywords subtly highlighted (accent-soft background), missing keywords
// underlined in rose." Segments the raw text around keyword occurrences,
// preserving the description's own casing.
export function HighlightedDescription({
  text,
  found,
  missing,
}: {
  text: string;
  found: string[];
  missing: string[];
}) {
  const foundSet = new Set(found.map((k) => k.toLowerCase()));
  const missingSet = new Set(missing.map((k) => k.toLowerCase()));
  const pattern = buildPattern([...found, ...missing]);

  if (!pattern) {
    return <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>;
  }

  const parts: { text: string; type: "found" | "missing" | "plain" }[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ text: text.slice(lastIndex, index), type: "plain" });
    const matched = match[0];
    const lower = matched.toLowerCase();
    parts.push({ text: matched, type: foundSet.has(lower) ? "found" : missingSet.has(lower) ? "missing" : "plain" });
    lastIndex = index + matched.length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), type: "plain" });

  return (
    <p className="whitespace-pre-wrap text-base leading-relaxed">
      {parts.map((part, i) => {
        if (part.type === "found") {
          return (
            <mark key={i} className="rounded-sm bg-accent-soft text-text">
              {part.text}
            </mark>
          );
        }
        if (part.type === "missing") {
          return (
            <span key={i} className="underline decoration-[var(--missing)] decoration-2 underline-offset-2">
              {part.text}
            </span>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </p>
  );
}

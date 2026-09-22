import { describe, expect, it } from "vitest";
import { alignToInputLength, renderBannedPhrasesPrompt, safeguardNumbers } from "./humanize";

describe("renderBannedPhrasesPrompt", () => {
  it("substitutes the placeholder with a comma-joined list", () => {
    const result = renderBannedPhrasesPrompt("Avoid: {{bannedPhrases}}.", ["leveraged", "synergy"]);
    expect(result).toBe("Avoid: leveraged, synergy.");
  });

  it("substitutes a placeholder message when the list is empty", () => {
    const result = renderBannedPhrasesPrompt("Avoid: {{bannedPhrases}}.", []);
    expect(result).toBe("Avoid: (none configured).");
  });
});

describe("alignToInputLength", () => {
  it("returns the returned values when lengths match", () => {
    expect(alignToInputLength(["a2", "b2"], ["a1", "b1"])).toEqual(["a2", "b2"]);
  });

  it("pads a short response with the original text at the missing indexes", () => {
    expect(alignToInputLength(["a2"], ["a1", "b1"])).toEqual(["a2", "b1"]);
  });

  it("truncates an over-long response to the original length", () => {
    expect(alignToInputLength(["a2", "b2", "c2"], ["a1", "b1"])).toEqual(["a2", "b2"]);
  });
});

describe("safeguardNumbers", () => {
  it("keeps humanized text whose numbers are a subset of the pre-humanize text", () => {
    const result = safeguardNumbers(["Cut load time 40% for users"], ["Reduced load time by 40% for 2M users"]);
    expect(result).toEqual(["Cut load time 40% for users"]);
  });

  it("reverts to pre-humanize text when a new number is invented", () => {
    const pre = ["Reduced load time by 40%"];
    const result = safeguardNumbers(["Reduced load time by 90%"], pre);
    expect(result).toEqual(pre);
  });

  it("keeps humanized text with no numbers at all", () => {
    const result = safeguardNumbers(["Owned the checkout redesign"], ["Owned the checkout redesign end to end"]);
    expect(result).toEqual(["Owned the checkout redesign"]);
  });

  it("passes through unchanged when there's no corresponding pre-humanize entry", () => {
    const result = safeguardNumbers(["Some new text 5"], []);
    expect(result).toEqual(["Some new text 5"]);
  });
});

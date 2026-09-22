import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { generateExtensionToken, hashToken } from "./tokens";

describe("hashToken", () => {
  it("is deterministic sha256 hex", () => {
    const expected = createHash("sha256").update("hello").digest("hex");
    expect(hashToken("hello")).toBe(expected);
  });

  it("differs for different input", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("generateExtensionToken", () => {
  it("produces an ad_-prefixed token whose hash matches hashToken", () => {
    const { token, hash } = generateExtensionToken();
    expect(token).toMatch(/^ad_[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(token));
  });

  it("returns a short display prefix that is a prefix of the full token", () => {
    const { token, prefix } = generateExtensionToken();
    expect(token.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(token.length);
  });

  it("never repeats across calls", () => {
    const a = generateExtensionToken();
    const b = generateExtensionToken();
    expect(a.token).not.toBe(b.token);
  });
});

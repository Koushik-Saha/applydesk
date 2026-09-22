import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOwnerEmail } from "./allowlist";

describe("isOwnerEmail", () => {
  const originalOwnerEmail = process.env.OWNER_EMAIL;

  beforeEach(() => {
    process.env.OWNER_EMAIL = "owner@example.com";
  });

  afterEach(() => {
    process.env.OWNER_EMAIL = originalOwnerEmail;
  });

  it("accepts the exact owner email", () => {
    expect(isOwnerEmail("owner@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isOwnerEmail("Owner@Example.com")).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isOwnerEmail("  owner@example.com  ")).toBe(true);
  });

  it("rejects any other email", () => {
    expect(isOwnerEmail("someone-else@example.com")).toBe(false);
  });

  it("rejects null/undefined/empty input", () => {
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
    expect(isOwnerEmail("")).toBe(false);
  });

  it("rejects everything when OWNER_EMAIL is unset", () => {
    delete process.env.OWNER_EMAIL;
    expect(isOwnerEmail("owner@example.com")).toBe(false);
  });
});

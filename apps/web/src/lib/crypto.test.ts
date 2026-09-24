import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto";

describe("crypto (AES-256-GCM)", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("decrypts back to the original plaintext", () => {
    const plaintext = "1//0gABCDEF-refresh-token-value";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("round-trips unicode content", () => {
    const plaintext = "Koushik Saha — résumé tokens 🔐";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "same-secret-value";
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it("throws when the auth tag doesn't match (tampered ciphertext)", () => {
    const packed = encrypt("sensitive-value");
    const buffer = Buffer.from(packed, "base64");
    const lastIndex = buffer.length - 1;
    buffer.writeUInt8(buffer.readUInt8(lastIndex) ^ 0xff, lastIndex); // flip the last ciphertext byte
    const tampered = buffer.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is not set", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("value")).toThrow("ENCRYPTION_KEY is not set.");
  });

  it("throws when ENCRYPTION_KEY isn't 32 bytes", () => {
    process.env.ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encrypt("value")).toThrow("32 bytes");
  });

  it("fails to decrypt with the wrong key", () => {
    const packed = encrypt("value");
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decrypt(packed)).toThrow();
  });
});

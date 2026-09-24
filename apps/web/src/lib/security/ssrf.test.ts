import { describe, expect, it } from "vitest";
import { validateSafeUrl } from "./ssrf";

describe("validateSafeUrl", () => {
  it("allows valid public http and https URLs", () => {
    expect(validateSafeUrl("https://jobs.lever.co/stripe/123").valid).toBe(true);
    expect(validateSafeUrl("https://boards.greenhouse.io/airbnb/jobs/456").valid).toBe(true);
    expect(validateSafeUrl("http://example.com/posting").valid).toBe(true);
  });

  it("blocks non-http/https protocols", () => {
    expect(validateSafeUrl("file:///etc/passwd").valid).toBe(false);
    expect(validateSafeUrl("ftp://files.example.com").valid).toBe(false);
    expect(validateSafeUrl("javascript:alert(1)").valid).toBe(false);
    expect(validateSafeUrl("data:text/html,<h1>hi</h1>").valid).toBe(false);
  });

  it("blocks localhost and local hostnames", () => {
    expect(validateSafeUrl("http://localhost:3000").valid).toBe(false);
    expect(validateSafeUrl("http://app.localhost").valid).toBe(false);
    expect(validateSafeUrl("http://mycomputer.local").valid).toBe(false);
  });

  it("blocks private IPv4 address ranges", () => {
    expect(validateSafeUrl("http://127.0.0.1:8080").valid).toBe(false);
    expect(validateSafeUrl("http://10.0.1.5").valid).toBe(false);
    expect(validateSafeUrl("http://172.16.0.1").valid).toBe(false);
    expect(validateSafeUrl("http://172.31.255.255").valid).toBe(false);
    expect(validateSafeUrl("http://192.168.1.1").valid).toBe(false);
    expect(validateSafeUrl("http://169.254.169.254/latest/meta-data/").valid).toBe(false);
    expect(validateSafeUrl("http://0.0.0.0").valid).toBe(false);
  });

  it("blocks IPv6 loopback", () => {
    expect(validateSafeUrl("http://[::1]:3000").valid).toBe(false);
  });
});

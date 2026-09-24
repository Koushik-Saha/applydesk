import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

describe("middleware CORS for /api/ext/*", () => {
  const originalEnv = process.env.EXTENSION_ID;

  beforeEach(() => {
    process.env.EXTENSION_ID = "testextensionid123";
  });

  afterEach(() => {
    process.env.EXTENSION_ID = originalEnv;
  });

  it("handles OPTIONS preflight with allowed extension origin", async () => {
    const request = new NextRequest("http://localhost:3000/api/ext/health", {
      method: "OPTIONS",
      headers: {
        origin: "chrome-extension://testextensionid123",
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "chrome-extension://testextensionid123",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("rejects unauthorized origin with 403", async () => {
    const request = new NextRequest("http://localhost:3000/api/ext/health", {
      method: "GET",
      headers: {
        origin: "chrome-extension://maliciousid999",
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("forbidden");
  });

  it("allows matching extension origin on GET", async () => {
    const request = new NextRequest("http://localhost:3000/api/ext/health", {
      method: "GET",
      headers: {
        origin: "chrome-extension://testextensionid123",
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "chrome-extension://testextensionid123",
    );
  });
});

describe("middleware frame headers", () => {
  // Both cases go through the unauthenticated redirect branch (no session
  // cookie), which is deterministic without needing a real session — the
  // frame-header exception applies before the auth check either way.
  it("denies framing by default", async () => {
    const request = new NextRequest("http://localhost:3000/jobs/abc123");
    const response = await middleware(request);
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("allows same-origin framing for the PDF preview route", async () => {
    const request = new NextRequest("http://localhost:3000/api/documents/abc123/pdf");
    const response = await middleware(request);
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
  });
});

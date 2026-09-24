// PROJECT_SPEC.md §10 — "If fetching a URL server-side (manual import),
// allow only http/https and block private/internal IP ranges."

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  parsedUrl?: URL;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (RFC 1918)
  if (a === 10) return true;
  // 172.16.0.0/12 (RFC 1918)
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (RFC 1918)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local, AWS/GCP metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  return false;
}

export function validateSafeUrl(rawUrl: string): UrlValidationResult {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: "Invalid URL format." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      valid: false,
      reason: `Blocked protocol: ${url.protocol}. Only http: and https: are permitted.`,
    };
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    return { valid: false, reason: `Blocked private or local hostname: ${hostname}` };
  }

  if (isPrivateIpv4(hostname)) {
    return { valid: false, reason: `Blocked private IP address: ${hostname}` };
  }

  // Block IPv6 loopback / link-local / internal
  if (
    hostname === "[::1]" ||
    hostname.startsWith("[fe80:") ||
    hostname.startsWith("[fc00:") ||
    hostname.startsWith("[fd")
  ) {
    return { valid: false, reason: `Blocked private IPv6 address: ${hostname}` };
  }

  return { valid: true, parsedUrl: url };
}

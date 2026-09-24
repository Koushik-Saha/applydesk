import { NextResponse } from "next/server";
import { withExtensionToken } from "@/lib/http/with-extension-token";

// PROJECT_SPEC.md §10 — Test connection / health check with extension token
export async function GET(request: Request) {
  return withExtensionToken(request, async ({ ownerId, tokenId }) => {
    return NextResponse.json({ ok: true, ownerId, tokenId });
  });
}

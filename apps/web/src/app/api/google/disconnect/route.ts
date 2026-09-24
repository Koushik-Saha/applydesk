import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { disconnectGoogle } from "@/lib/google/service";

// PROJECT_SPEC.md §9 — POST /api/google/disconnect
export async function POST() {
  return withOwner(async (ownerId) => {
    await disconnectGoogle(ownerId);
    return NextResponse.json({ ok: true });
  });
}

import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { listProfileVersions } from "@/lib/profile/service";

export async function GET() {
  return withOwner(async (ownerId) => {
    const versions = await listProfileVersions(ownerId);
    return NextResponse.json({ versions });
  });
}

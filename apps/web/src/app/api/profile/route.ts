import { NextResponse } from "next/server";
import { masterProfileSchema, emptyMasterProfile } from "@applydesk/shared";
import { withOwner } from "@/lib/http/with-owner";
import { getActiveProfile, saveProfileVersion } from "@/lib/profile/service";

export async function GET() {
  return withOwner(async (ownerId) => {
    const active = await getActiveProfile(ownerId);
    return NextResponse.json({
      profile: active?.profile ?? emptyMasterProfile(),
      version: active?.version ?? null,
    });
  });
}

export async function PUT(request: Request) {
  return withOwner(async (ownerId) => {
    const body = await request.json();
    const data = masterProfileSchema.parse(body.data);
    const note = typeof body.note === "string" ? body.note : undefined;

    const saved = await saveProfileVersion(ownerId, data, note);
    return NextResponse.json({ profile: saved.profile, version: saved.version });
  });
}

import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { settingsDataSchema } from "@applydesk/shared";
import { getSettings, saveSettings } from "@/lib/settings/service";

// PROJECT_SPEC.md §9 — GET/PUT /api/settings
export async function GET() {
  return withOwner(async (ownerId) => {
    const settings = await getSettings(ownerId);
    return NextResponse.json({ settings });
  });
}

export async function PUT(request: Request) {
  return withOwner(async (ownerId) => {
    const body = await request.json();
    const validated = settingsDataSchema.parse(body);
    const updated = await saveSettings(ownerId, validated);
    return NextResponse.json({ settings: updated });
  });
}

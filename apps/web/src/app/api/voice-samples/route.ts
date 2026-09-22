import { NextResponse } from "next/server";
import { voiceSampleInputSchema } from "@applydesk/shared";
import { withOwner } from "@/lib/http/with-owner";
import { createVoiceSample, listVoiceSamples } from "@/lib/profile/voice-samples-service";

export async function GET() {
  return withOwner(async (ownerId) => {
    const samples = await listVoiceSamples(ownerId);
    return NextResponse.json({ samples });
  });
}

export async function POST(request: Request) {
  return withOwner(async (ownerId) => {
    const body = await request.json();
    const input = voiceSampleInputSchema.parse(body);
    const sample = await createVoiceSample(ownerId, input);
    return NextResponse.json({ sample }, { status: 201 });
  });
}

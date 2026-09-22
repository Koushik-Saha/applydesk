import { NextResponse } from "next/server";
import { voiceSampleInputSchema } from "@applydesk/shared";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import {
  deleteVoiceSample,
  updateVoiceSample,
  VoiceSampleNotFoundError,
} from "@/lib/profile/voice-samples-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const body = await request.json();
    const input = voiceSampleInputSchema.parse(body);
    try {
      const sample = await updateVoiceSample(ownerId, id, input);
      return NextResponse.json({ sample });
    } catch (error) {
      if (error instanceof VoiceSampleNotFoundError) {
        return jsonError("not_found", error.message, 404);
      }
      throw error;
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    try {
      await deleteVoiceSample(ownerId, id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof VoiceSampleNotFoundError) {
        return jsonError("not_found", error.message, 404);
      }
      throw error;
    }
  });
}

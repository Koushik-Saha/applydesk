import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { restoreProfileVersion, VersionNotFoundError } from "@/lib/profile/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    try {
      const restored = await restoreProfileVersion(ownerId, id);
      return NextResponse.json({ profile: restored.profile, version: restored.version });
    } catch (error) {
      if (error instanceof VersionNotFoundError) {
        return jsonError("not_found", error.message, 404);
      }
      throw error;
    }
  });
}

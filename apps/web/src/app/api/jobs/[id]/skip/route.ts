import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { JobNotFoundError, skipJob } from "@/lib/jobs/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    try {
      await skipJob(ownerId, id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof JobNotFoundError) return jsonError("not_found", error.message, 404);
      throw error;
    }
  });
}

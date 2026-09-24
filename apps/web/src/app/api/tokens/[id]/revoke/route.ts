import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { revokeToken } from "@/lib/tokens/service";
import { jsonError } from "@/lib/http/api-error";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withOwner(async (ownerId) => {
    const { id } = await params;
    const ok = await revokeToken(ownerId, id);
    if (!ok) {
      return jsonError("not_found", "Token not found or already revoked", 404);
    }
    return NextResponse.json({ ok: true });
  });
}

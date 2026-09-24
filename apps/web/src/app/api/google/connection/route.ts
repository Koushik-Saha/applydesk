import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { getConnection } from "@/lib/google/service";

export async function GET() {
  return withOwner(async (ownerId) => {
    const connection = await getConnection(ownerId);
    return NextResponse.json({
      connected: !!connection,
      googleEmail: connection?.googleEmail ?? null,
      rootFolderId: connection?.rootFolderId ?? null,
      connectedAt: connection?.connectedAt?.toISOString() ?? null,
    });
  });
}

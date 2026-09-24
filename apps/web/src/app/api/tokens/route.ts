import { NextResponse } from "next/server";
import { z } from "zod";
import { withOwner } from "@/lib/http/with-owner";
import { listTokens, createToken } from "@/lib/tokens/service";

const createTokenSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export async function GET() {
  return withOwner(async (ownerId) => {
    const tokens = await listTokens(ownerId);
    return NextResponse.json({ tokens });
  });
}

export async function POST(request: Request) {
  return withOwner(async (ownerId) => {
    const body = await request.json();
    const { name } = createTokenSchema.parse(body);

    const token = await createToken(ownerId, name);
    return NextResponse.json(token, { status: 201 });
  });
}

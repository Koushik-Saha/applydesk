import { NextResponse } from "next/server";
import { standardAnswersSchema } from "@applydesk/shared";
import { withOwner } from "@/lib/http/with-owner";
import { getStandardAnswers, saveStandardAnswers } from "@/lib/profile/standard-answers-service";

export async function GET() {
  return withOwner(async (ownerId) => {
    const answers = await getStandardAnswers(ownerId);
    return NextResponse.json({ answers });
  });
}

export async function PUT(request: Request) {
  return withOwner(async (ownerId) => {
    const body = await request.json();
    const data = standardAnswersSchema.parse(body);
    const saved = await saveStandardAnswers(ownerId, data);
    return NextResponse.json({ answers: saved });
  });
}

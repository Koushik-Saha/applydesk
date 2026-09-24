import { NextResponse } from "next/server";
import { withExtensionToken } from "@/lib/http/with-extension-token";
import { getStandardAnswers } from "@/lib/profile/standard-answers-service";

// PROJECT_SPEC.md §8 — GET /api/ext/answers: standard answers for extension autofill
export async function GET(request: Request) {
  return withExtensionToken(request, async ({ ownerId }) => {
    const answers = await getStandardAnswers(ownerId);
    return NextResponse.json({ answers });
  });
}

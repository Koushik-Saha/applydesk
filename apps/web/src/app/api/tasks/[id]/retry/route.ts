import { NextResponse } from "next/server";
import { withOwner } from "@/lib/http/with-owner";
import { jsonError } from "@/lib/http/api-error";
import { retryTask, TaskNotRetryableError } from "@/lib/tasks/retry";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withOwner(async () => {
    const { id } = await params;
    try {
      await retryTask(id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof TaskNotRetryableError) {
        return jsonError("not_retryable", error.message, 409);
      }
      throw error;
    }
  });
}

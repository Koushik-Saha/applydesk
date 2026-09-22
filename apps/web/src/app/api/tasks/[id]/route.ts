import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAnyAuth } from "@/lib/http/with-any-auth";
import { jsonError } from "@/lib/http/api-error";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAnyAuth(request, async () => {
    const { id } = await params;
    const [task] = await db
      .select({
        id: tasks.id,
        type: tasks.type,
        status: tasks.status,
        currentStep: tasks.currentStep,
        attempts: tasks.attempts,
        error: tasks.error,
        createdAt: tasks.createdAt,
        finishedAt: tasks.finishedAt,
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task) return jsonError("not_found", `No such task: ${id}`, 404);
    return NextResponse.json({ task });
  });
}

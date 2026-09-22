import { NextResponse } from "next/server";
import { withAnyAuth } from "@/lib/http/with-any-auth";
import { jsonError } from "@/lib/http/api-error";
import { getTask } from "@/lib/tasks/get-task";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAnyAuth(request, async () => {
    const { id } = await params;
    const task = await getTask(id);
    if (!task) return jsonError("not_found", `No such task: ${id}`, 404);
    return NextResponse.json({ task });
  });
}

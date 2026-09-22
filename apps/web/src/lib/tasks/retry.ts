import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { runTask } from "./run-task";

export class TaskNotRetryableError extends Error {}

// PROJECT_SPEC.md §6.1 — "manual Retry button on failures." Only a task
// that's actually "failed" can be retried; the conditional UPDATE makes
// that check atomic against a concurrent retry/run.
export async function retryTask(taskId: string): Promise<void> {
  const reset = await db
    .update(tasks)
    .set({ status: "queued", error: null, lockedAt: null, currentStep: null })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, "failed")))
    .returning({ id: tasks.id });

  if (reset.length === 0) {
    throw new TaskNotRetryableError(`Task ${taskId} is not in a failed state`);
  }

  after(() => runTask(taskId));
}

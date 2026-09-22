import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { getTaskHandler } from "./registry";
import "./handlers";

// PROJECT_SPEC.md §6.1 — locking via a conditional UPDATE: the WHERE clause
// only matches (and Postgres only lets one concurrent UPDATE win) if the
// task is still "queued", so two overlapping runTask() calls for the same
// id can never both execute the handler.
export async function runTask(taskId: string): Promise<void> {
  const claimed = await db
    .update(tasks)
    .set({ status: "running", lockedAt: new Date(), attempts: sql`${tasks.attempts} + 1` })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, "queued")))
    .returning();

  const task = claimed[0];
  if (!task) return;

  const handler = getTaskHandler(task.type);
  if (!handler) {
    await db
      .update(tasks)
      .set({
        status: "failed",
        error: `No handler registered for task type "${task.type}"`,
        finishedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();
    return;
  }

  const setStep = async (step: string) => {
    await db.update(tasks).set({ currentStep: step }).where(eq(tasks.id, taskId)).returning();
  };

  try {
    await handler(task.payload, { taskId, setStep });
    await db
      .update(tasks)
      .set({ status: "done", finishedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
  } catch (error) {
    await db
      .update(tasks)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();
  }
}

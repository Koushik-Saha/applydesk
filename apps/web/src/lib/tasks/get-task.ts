import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";

export async function getTask(id: string) {
  const [task] = await db
    .select({
      id: tasks.id,
      type: tasks.type,
      status: tasks.status,
      currentStep: tasks.currentStep,
      attempts: tasks.attempts,
      error: tasks.error,
      result: tasks.result,
      createdAt: tasks.createdAt,
      finishedAt: tasks.finishedAt,
    })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  return task ?? null;
}

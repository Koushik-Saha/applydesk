import { and, desc, eq } from "drizzle-orm";
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

// Lets a job's own detail page find "the task that's analyzing me" to poll,
// without needing a dedicated column on `jobs` for it.
export async function getLatestTaskForJob(jobId: string, type: string) {
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
    .where(and(eq(tasks.jobId, jobId), eq(tasks.type, type)))
    .orderBy(desc(tasks.createdAt))
    .limit(1);

  return task ?? null;
}

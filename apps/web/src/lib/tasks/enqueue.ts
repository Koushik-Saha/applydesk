import { after } from "next/server";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { runTask } from "./run-task";

// PROJECT_SPEC.md §6.1 — "Enqueue -> return 202 with task id -> run the task
// in Next.js after()." Must be called from within a request (route handler
// or server action) since after() schedules work for after the response.
export async function enqueueTask(type: string, payload: unknown, jobId?: string): Promise<{ id: string }> {
  const [row] = await db.insert(tasks).values({ type, payload, jobId }).returning({ id: tasks.id });
  after(() => runTask(row!.id));
  return { id: row!.id };
}

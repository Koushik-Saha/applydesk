import { and, eq, lt } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { runTask } from "./run-task";

const STALE_AFTER_MS = 10 * 60 * 1000;

// PROJECT_SPEC.md §6.1 — "tasks running for > 10 min are reset to queued on
// the next dashboard load." There's no separate worker sweeping "queued"
// rows, so this also re-triggers each one via after() — valid here since
// it's only ever called from within a page load (a request).
export async function recoverStaleTasks(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const recovered = await db
    .update(tasks)
    .set({ status: "queued", lockedAt: null })
    .where(and(eq(tasks.status, "running"), lt(tasks.lockedAt, cutoff)))
    .returning({ id: tasks.id });

  for (const { id } of recovered) {
    after(() => runTask(id));
  }
}

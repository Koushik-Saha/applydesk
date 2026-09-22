// PROJECT_SPEC.md §6.1 — each task `type` (profile_import, job_analyze,
// job_generate, ...) registers its own handler here, independent of the
// runner. A milestone adding a new task type never touches run-task.ts.
export type TaskHandler = (
  payload: unknown,
  ctx: { taskId: string; setStep: (step: string) => Promise<void> },
) => Promise<unknown>;

const registry = new Map<string, TaskHandler>();

export function registerTaskHandler(type: string, handler: TaskHandler): void {
  registry.set(type, handler);
}

export function getTaskHandler(type: string): TaskHandler | undefined {
  return registry.get(type);
}

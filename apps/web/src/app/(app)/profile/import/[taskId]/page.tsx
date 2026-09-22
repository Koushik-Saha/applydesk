import { notFound, redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/require-owner";
import { AuthError } from "@/lib/auth/errors";
import { getTask } from "@/lib/tasks/get-task";
import { ImportReviewFlow } from "./import-review-flow";

export default async function ImportReviewPage({ params }: { params: Promise<{ taskId: string }> }) {
  try {
    await requireOwner();
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }

  const { taskId } = await params;
  const task = await getTask(taskId);
  if (!task || task.type !== "profile_import") notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <ImportReviewFlow taskId={taskId} initialTask={task} />
    </div>
  );
}

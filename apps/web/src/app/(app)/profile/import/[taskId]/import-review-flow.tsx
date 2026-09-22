"use client";

import { useState } from "react";
import type { MasterProfile } from "@applydesk/shared";
import { TaskProgress, type TaskStep } from "@/components/task-progress";
import { ErrorState } from "@/components/error-state";
import { ImportReviewEditor } from "./import-review-editor";

const IMPORT_STEPS: TaskStep[] = [
  { key: "parsing", label: "Reading your resume" },
  { key: "finalizing", label: "Finalizing profile" },
];

interface ImportTask {
  id: string;
  type: string;
  status: "queued" | "running" | "done" | "failed";
  currentStep: string | null;
  attempts: number;
  error: string | null;
  result: unknown;
}

interface ProfileImportResult {
  profile: MasterProfile;
  extractedText: string;
}

export function ImportReviewFlow({ taskId, initialTask }: { taskId: string; initialTask: ImportTask }) {
  const [task, setTask] = useState(initialTask);

  if (task.status !== "done") {
    return (
      <div className="mx-auto max-w-md py-16">
        <TaskProgress taskId={taskId} steps={IMPORT_STEPS} onDone={setTask} />
      </div>
    );
  }

  const result = task.result as ProfileImportResult | null;
  if (!result) {
    return (
      <div className="py-16">
        <ErrorState message="The import finished but produced nothing to review. Try importing again." />
      </div>
    );
  }

  return <ImportReviewEditor extractedText={result.extractedText} initialProfile={result.profile} />;
}

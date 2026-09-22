"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export interface TaskStep {
  key: string;
  label: string;
}

interface Task {
  id: string;
  type: string;
  status: "queued" | "running" | "done" | "failed";
  currentStep: string | null;
  attempts: number;
  error: string | null;
  result: unknown;
}

interface TaskProgressProps {
  taskId: string;
  steps: TaskStep[];
  onDone?: (task: Task) => void;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Request failed.");
  }
  return res.json();
}

type StepState = "done" | "active" | "failed" | "pending";

function stepState(index: number, task: Task, currentIndex: number): StepState {
  if (task.status === "done") return "done";
  if (task.status === "failed") {
    const failedAt = currentIndex >= 0 ? currentIndex : 0;
    if (index < failedAt) return "done";
    return index === failedAt ? "failed" : "pending";
  }
  if (task.status === "running") {
    const activeAt = currentIndex >= 0 ? currentIndex : 0;
    if (index < activeAt) return "done";
    return index === activeAt ? "active" : "pending";
  }
  return "pending";
}

// DESIGN.md §7 — "AI in progress: step list ... each step checks off live."
export function TaskProgress({ taskId, steps, onDone }: TaskProgressProps) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchJson<{ task: Task }>(`/api/tasks/${taskId}`).then((r) => r.task),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "done" || status === "failed" ? false : 2000;
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => fetchJson(`/api/tasks/${taskId}/retry`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
  });

  useEffect(() => {
    if (query.data?.status === "done") onDone?.(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.status]);

  if (query.isPending) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Failed to load task status."}
        onRetry={() => query.refetch()}
      />
    );
  }

  const task = query.data;
  const currentIndex = steps.findIndex((s) => s.key === task.currentStep);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <ul className="flex flex-col gap-2" aria-live="polite">
        {steps.map((step, i) => {
          const state = stepState(i, task, currentIndex);
          return (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {state === "done" && <CheckCircle2 className="size-4 shrink-0 text-[var(--met)]" />}
              {state === "active" && (
                <Loader2 className="size-4 shrink-0 animate-spin text-[var(--accent)]" />
              )}
              {state === "failed" && <XCircle className="size-4 shrink-0 text-[var(--missing)]" />}
              {state === "pending" && <Circle className="size-4 shrink-0 text-text-muted" />}
              <span className={cn(state === "pending" ? "text-text-muted" : "text-text")}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>

      {task.status === "failed" && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm text-[var(--missing)]">{task.error ?? "Task failed."}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

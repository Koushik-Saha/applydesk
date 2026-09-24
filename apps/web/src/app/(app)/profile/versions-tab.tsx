"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { ProfileVersionSummary } from "@/lib/profile/service";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Request failed.");
  }
  return res.json();
}

export function VersionsTab({
  initialVersions,
  activeVersion,
}: {
  initialVersions: ProfileVersionSummary[];
  activeVersion: number | null;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["profile-versions"],
    queryFn: () =>
      fetchJson<{ versions: ProfileVersionSummary[] }>("/api/profile/versions").then((r) => r.versions),
    initialData: initialVersions,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ profile: unknown; version: number }>(`/api/profile/versions/${id}/restore`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      toast.success(`Restored version ${data.version}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to restore version."),
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Failed to load versions."}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.data.length === 0) {
    return <EmptyState icon={History} message="No saved versions yet. Save the profile to create one." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {query.data.map((v) => {
        const isActive = v.version === activeVersion;
        return (
          <div
            key={v.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div>
              <p className="font-mono text-sm">
                v{v.version}
                {isActive && <span className="ml-2 rounded-sm bg-accent-soft px-1.5 py-0.5 text-xs text-[var(--accent)]">active</span>}
              </p>
              <p className="text-xs text-text-muted">
                {new Date(v.createdAt).toLocaleString()}
                {v.note ? ` · ${v.note}` : ""}
              </p>
            </div>
            {!isActive && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => restoreMutation.mutate(v.id)}
                disabled={restoreMutation.isPending}
              >
                {restoreMutation.isPending && restoreMutation.variables === v.id ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                {restoreMutation.isPending && restoreMutation.variables === v.id ? "Restoring..." : "Restore"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

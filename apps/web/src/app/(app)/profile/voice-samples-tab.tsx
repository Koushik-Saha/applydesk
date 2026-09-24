"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mic, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

interface VoiceSample {
  id: string;
  title: string;
  text: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Request failed.");
  }
  return res.json();
}

export function VoiceSamplesTab({ initialSamples }: { initialSamples: VoiceSample[] }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["voice-samples"],
    queryFn: () => fetchJson<{ samples: VoiceSample[] }>("/api/voice-samples").then((r) => r.samples),
    initialData: initialSamples,
  });

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const createMutation = useMutation({
    mutationFn: () => fetchJson("/api/voice-samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-samples"] });
      setTitle("");
      setText("");
      toast.success("Voice sample added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add voice sample."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/voice-samples/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-samples"] });
      toast.success("Voice sample removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove voice sample."),
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Failed to load voice samples."}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. LinkedIn post)" />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a sample of your own writing..."
          rows={4}
        />
        <Button
          className="w-fit gap-1.5"
          disabled={!title.trim() || !text.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? <Spinner /> : <Plus className="size-4" />}
          {createMutation.isPending ? "Adding..." : "Add sample"}
        </Button>
      </div>

      {query.data.length === 0 ? (
        <EmptyState
          icon={Mic}
          message="No voice samples yet. Add 3-5 pieces of your own writing to help humanize generated documents."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {query.data.map((sample) => (
            <div key={sample.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{sample.title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-text-muted">{sample.text}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete"
                onClick={() => deleteMutation.mutate(sample.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && deleteMutation.variables === sample.id ? (
                  <Spinner className="text-[var(--missing)]" />
                ) : (
                  <Trash2 className="size-4 text-[var(--missing)]" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

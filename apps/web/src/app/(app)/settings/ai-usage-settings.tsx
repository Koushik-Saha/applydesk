"use client";

import { useQuery } from "@tanstack/react-query";
import { DollarSign, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";

interface UsageData {
  month: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;
  byStep: Record<
    string,
    { count: number; costUsd: number; inputTokens: number; outputTokens: number }
  >;
  recentCalls: Array<{
    id: string;
    step: string;
    model: string;
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    at: string;
  }>;
}

export function AiUsageSettings() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["ai-usage"],
    queryFn: async (): Promise<UsageData> => {
      const res = await fetch("/api/usage");
      if (!res.ok) throw new Error("Failed to load usage data.");
      return res.json();
    },
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          <DollarSign className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-medium text-text">AI Usage & Costs</h2>
          <p className="text-xs text-text-muted">
            Track token consumption and API expenditures for current billing period
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <div className="mt-5">
          <ErrorState
            message={error instanceof Error ? error.message : "Failed to load usage data."}
            onRetry={() => refetch()}
          />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-bg/50 p-3">
              <span className="text-xs text-text-muted block">This Month ({data.month})</span>
              <span className="font-mono text-xl font-semibold text-text mt-1 block">
                ${data.totalCostUsd.toFixed(4)}
              </span>
            </div>

            <div className="rounded-lg border border-border bg-bg/50 p-3">
              <span className="text-xs text-text-muted block">Total Calls</span>
              <span className="font-mono text-xl font-semibold text-text mt-1 block">
                {data.totalCalls}
              </span>
            </div>

            <div className="rounded-lg border border-border bg-bg/50 p-3">
              <span className="text-xs text-text-muted block">Input Tokens</span>
              <span className="font-mono text-xl font-semibold text-text mt-1 block">
                {data.totalInputTokens.toLocaleString()}
              </span>
            </div>

            <div className="rounded-lg border border-border bg-bg/50 p-3">
              <span className="text-xs text-text-muted block">Output Tokens</span>
              <span className="font-mono text-xl font-semibold text-text mt-1 block">
                {data.totalOutputTokens.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Breakdown by pipeline step */}
          {Object.keys(data.byStep).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <BarChart3 className="size-3.5" />
                Step Breakdown
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 dark:bg-stone-800 text-text-muted border-b border-border">
                    <tr>
                      <th className="p-2.5 font-medium">Pipeline Step</th>
                      <th className="p-2.5 font-medium text-right">Calls</th>
                      <th className="p-2.5 font-medium text-right">Tokens</th>
                      <th className="p-2.5 font-medium text-right">Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {Object.entries(data.byStep).map(([step, info]) => (
                      <tr key={step} className="hover:bg-bg/40">
                        <td className="p-2.5 font-medium text-text">{step}</td>
                        <td className="p-2.5 font-mono text-right text-text-muted">{info.count}</td>
                        <td className="p-2.5 font-mono text-right text-text-muted">
                          {(info.inputTokens + info.outputTokens).toLocaleString()}
                        </td>
                        <td className="p-2.5 font-mono text-right text-text font-medium">
                          ${info.costUsd.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

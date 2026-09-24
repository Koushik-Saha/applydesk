import { NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { withOwner } from "@/lib/http/with-owner";
import { db } from "@/lib/db/client";
import { aiUsage } from "@/lib/db/schema";

// PROJECT_SPEC.md §9 — GET /api/usage "AI usage and cost this month"
export async function GET() {
  return withOwner(async () => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const rows = await db
      .select()
      .from(aiUsage)
      .where(gte(aiUsage.at, startOfMonth))
      .orderBy(desc(aiUsage.at));

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;

    const byStep: Record<
      string,
      { count: number; costUsd: number; inputTokens: number; outputTokens: number }
    > = {};

    for (const row of rows) {
      const cost = Number(row.costUsd) || 0;
      totalInputTokens += row.inputTokens;
      totalOutputTokens += row.outputTokens;
      totalCostUsd += cost;

      const stepEntry = (byStep[row.step] ??= {
        count: 0,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
      });
      stepEntry.count += 1;
      stepEntry.costUsd += cost;
      stepEntry.inputTokens += row.inputTokens;
      stepEntry.outputTokens += row.outputTokens;
    }

    return NextResponse.json({
      month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      totalInputTokens,
      totalOutputTokens,
      totalCalls: rows.length,
      byStep,
      recentCalls: rows.slice(0, 10).map((r) => ({
        id: r.id,
        step: r.step,
        model: r.model,
        costUsd: Number(r.costUsd),
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        at: r.at.toISOString(),
      })),
    });
  });
}

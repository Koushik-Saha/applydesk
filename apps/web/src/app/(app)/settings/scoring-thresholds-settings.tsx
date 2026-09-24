"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { ScoreThresholds } from "@applydesk/shared";

interface ScoringThresholdsProps {
  initialThresholds: ScoreThresholds;
}

export function ScoringThresholdsSettings({ initialThresholds }: ScoringThresholdsProps) {
  const [thresholds, setThresholds] = useState<ScoreThresholds>(initialThresholds);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (thresholds.good >= thresholds.strong) {
      toast.error("Good cutoff must be lower than Strong cutoff.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreThresholds: thresholds }),
      });
      if (!res.ok) throw new Error("Failed to save thresholds.");
      toast.success("Scoring thresholds saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          <Gauge className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-medium text-text">Scoring Thresholds</h2>
          <p className="text-xs text-text-muted">
            Configure cutoff points for fit score bands (0–100 scale)
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="strong-cutoff" className="text-xs text-text-muted">
            Strong Match Cutoff (default: 80)
          </Label>
          <Input
            id="strong-cutoff"
            type="number"
            min={1}
            max={100}
            value={thresholds.strong}
            onChange={(e) =>
              setThresholds({ ...thresholds, strong: Number(e.target.value) || 0 })
            }
          />
          <p className="text-[11px] text-text-muted">
            Scores ≥ {thresholds.strong} are marked as Strong Match (green).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="good-cutoff" className="text-xs text-text-muted">
            Good Match Cutoff (default: 65)
          </Label>
          <Input
            id="good-cutoff"
            type="number"
            min={1}
            max={100}
            value={thresholds.good}
            onChange={(e) =>
              setThresholds({ ...thresholds, good: Number(e.target.value) || 0 })
            }
          />
          <p className="text-[11px] text-text-muted">
            Scores between {thresholds.good} and {thresholds.strong - 1} are Good (amber).
          </p>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-border flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving && <Spinner />}
          {saving ? "Saving..." : "Save Thresholds"}
        </Button>
      </div>
    </div>
  );
}

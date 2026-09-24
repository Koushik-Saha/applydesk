"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { ModelsSettings } from "@applydesk/shared";

interface ModelsSettingsProps {
  initialModels: ModelsSettings;
}

export function ModelsSettingsComponent({ initialModels }: ModelsSettingsProps) {
  const [models, setModels] = useState<ModelsSettings>(initialModels);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models }),
      });
      if (!res.ok) throw new Error("Failed to save models.");
      toast.success("AI models saved.");
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
          <Cpu className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-medium text-text">AI Models Configuration</h2>
          <p className="text-xs text-text-muted">
            Configure default Claude models used per pipeline step
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="model-extract" className="text-xs text-text-muted">
            Extraction & Analysis Model (fast & cost-effective)
          </Label>
          <Input
            id="model-extract"
            value={models.extract}
            onChange={(e) => setModels({ ...models, extract: e.target.value })}
            placeholder="claude-haiku-4-5"
          />
          <p className="text-[11px] text-text-muted">
            Used for job requirement extraction and candidate evidence matching.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="model-write" className="text-xs text-text-muted">
            Writing & Humanize Model (creative & high-reasoning)
          </Label>
          <Input
            id="model-write"
            value={models.write}
            onChange={(e) => setModels({ ...models, write: e.target.value })}
            placeholder="claude-sonnet-5"
          />
          <p className="text-[11px] text-text-muted">
            Used for tailored resume rewriting and cover letter drafting.
          </p>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-border flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving && <Spinner />}
          {saving ? "Saving..." : "Save Models"}
        </Button>
      </div>
    </div>
  );
}

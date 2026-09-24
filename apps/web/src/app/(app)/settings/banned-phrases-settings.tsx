"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface BannedPhrasesProps {
  initialPhrases: string[];
}

export function BannedPhrasesSettings({ initialPhrases }: BannedPhrasesProps) {
  const [phrases, setPhrases] = useState<string[]>(initialPhrases);
  const [newPhrase, setNewPhrase] = useState("");
  const [saving, setSaving] = useState(false);

  function addPhrase() {
    const trimmed = newPhrase.trim().toLowerCase();
    if (!trimmed) return;
    if (phrases.includes(trimmed)) {
      toast.error("Phrase already in list.");
      return;
    }
    setPhrases([...phrases, trimmed]);
    setNewPhrase("");
  }

  function removePhrase(phraseToRemove: string) {
    setPhrases(phrases.filter((p) => p !== phraseToRemove));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannedPhrases: phrases }),
      });
      if (!res.ok) throw new Error("Failed to save banned phrases.");
      toast.success("Banned phrases saved.");
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
          <ShieldAlert className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-medium text-text">Banned Phrases Editor</h2>
          <p className="text-xs text-text-muted">
            Phrases flagged by the humanize lint pass to avoid generic AI clichés
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Add phrase input */}
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Add a cliché phrase (e.g. spearhead)..."
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPhrase();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addPhrase}>
            <Plus className="size-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* Phrases chips */}
        <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto rounded-lg border border-border bg-bg/50 p-3">
          {phrases.map((phrase) => (
            <span
              key={phrase}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text shadow-2xs"
            >
              <span>{phrase}</span>
              <button
                type="button"
                onClick={() => removePhrase(phrase)}
                className="text-text-muted hover:text-rose-500 transition-colors"
                aria-label={`Remove ${phrase}`}
                title={`Remove ${phrase}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          {phrases.length === 0 && (
            <p className="text-xs text-text-muted">No banned phrases configured.</p>
          )}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-border flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving && <Spinner />}
          {saving ? "Saving..." : "Save Banned Phrases"}
        </Button>
      </div>
    </div>
  );
}

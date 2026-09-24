"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

// PROJECT_SPEC.md §4.2 — manual add: title, company, url, description.
export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", company: "", url: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.title.trim() && form.company.trim() && form.url.trim() && form.description.trim();

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to add job.");
      }
      const body = (await res.json()) as { job: { id: string }; duplicate: boolean };
      if (body.duplicate) toast.message("Already saved — opening the existing job.");
      router.push(`/jobs/${body.job.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add job.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="title" className="text-xs text-text-muted">
          Title
        </Label>
        <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="company" className="text-xs text-text-muted">
          Company
        </Label>
        <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="url" className="text-xs text-text-muted">
          Job posting URL
        </Label>
        <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="description" className="text-xs text-text-muted">
          Description
        </Label>
        <Textarea
          id="description"
          rows={14}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-[var(--missing)]">{error}</p>}

      <Button onClick={submit} disabled={!canSubmit || saving} className="w-fit gap-1.5">
        {saving && <Spinner />}
        {saving ? "Saving…" : "Save job"}
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MasterProfile } from "@applydesk/shared";
import { Button } from "@/components/ui/button";
import { ProfileSections } from "../../profile-sections";

// PROJECT_SPEC.md §4.1 — "Show the parsed result in a review screen side by
// side with the extracted text; I can edit, then 'Save as new version'."
export function ImportReviewEditor({
  extractedText,
  initialProfile,
}: {
  extractedText: string;
  initialProfile: MasterProfile;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: profile, note: "Imported from resume" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to save profile.");
      }
      toast.success("Profile saved");
      router.push("/profile");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save profile.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex h-[75dvh] flex-col rounded-xl border border-border bg-surface lg:sticky lg:top-6">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Extracted text</div>
        <pre className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 font-sans text-sm text-text-muted">
          {extractedText}
        </pre>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-sm text-text-muted">Review the parsed profile and fix anything that&apos;s wrong.</p>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save as new version"}
          </Button>
        </div>

        {error && <p className="text-sm text-[var(--missing)]">{error}</p>}

        <ProfileSections profile={profile} onChange={setProfile} />
      </div>
    </div>
  );
}

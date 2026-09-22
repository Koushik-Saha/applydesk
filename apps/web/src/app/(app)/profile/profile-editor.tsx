"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MasterProfile } from "@applydesk/shared";
import { Button } from "@/components/ui/button";
import { ProfileSections } from "./profile-sections";
import { ImportUploadDialog } from "./import-upload-dialog";

interface ProfileEditorProps {
  initialProfile: MasterProfile;
  version: number | null;
}

export function ProfileEditor({ initialProfile, version }: ProfileEditorProps) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(profile) !== JSON.stringify(initialProfile);

  useEffect(() => {
    function warnBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: profile }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to save profile.");
      }
      const body = (await res.json()) as { profile: MasterProfile; version: number };
      queryClient.setQueryData(["profile"], { profile: body.profile, version: body.version });
      queryClient.invalidateQueries({ queryKey: ["profile-versions"] });
      toast.success(`Saved as version ${body.version}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save profile.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="text-sm text-text-muted">
          {version ? (
            <>
              Version <span className="font-mono text-text">{version}</span>
              {dirty && <span className="ml-2 text-[var(--partial)]">Unsaved changes</span>}
            </>
          ) : (
            "Not saved yet"
          )}
        </div>
        <div className="flex items-center gap-2">
          <ImportUploadDialog />
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--missing)]">{error}</p>}

      <ProfileSections profile={profile} onChange={setProfile} />
    </div>
  );
}

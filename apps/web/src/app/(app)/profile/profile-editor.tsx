"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MasterProfile } from "@applydesk/shared";
import { Button } from "@/components/ui/button";
import { CollapsiblePanel } from "./collapsible-panel";
import { ContactSection } from "./contact-section";
import { SummarySection } from "./summary-section";
import { ExperienceSection } from "./experience-section";
import { ProjectsSection } from "./projects-section";
import { EducationSection } from "./education-section";
import { CertificationsSection } from "./certifications-section";
import { PublicationsSection } from "./publications-section";
import { SkillsSection } from "./skills-section";

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
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {error && <p className="text-sm text-[var(--missing)]">{error}</p>}

      <CollapsiblePanel title="Contact">
        <ContactSection contact={profile.contact} onChange={(contact) => setProfile((p) => ({ ...p, contact }))} />
      </CollapsiblePanel>

      <CollapsiblePanel title="Summary">
        <SummarySection summary={profile.summary} onChange={(summary) => setProfile((p) => ({ ...p, summary }))} />
      </CollapsiblePanel>

      <CollapsiblePanel title="Experience" meta={<span className="font-mono text-xs">{profile.experiences.length}</span>}>
        <ExperienceSection
          experiences={profile.experiences}
          onChange={(experiences) => setProfile((p) => ({ ...p, experiences }))}
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Projects"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.projects.length}</span>}
      >
        <ProjectsSection projects={profile.projects} onChange={(projects) => setProfile((p) => ({ ...p, projects }))} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Education"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.education.length}</span>}
      >
        <EducationSection education={profile.education} onChange={(education) => setProfile((p) => ({ ...p, education }))} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Certifications"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.certifications.length}</span>}
      >
        <CertificationsSection
          certifications={profile.certifications}
          onChange={(certifications) => setProfile((p) => ({ ...p, certifications }))}
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Publications"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.publications.length}</span>}
      >
        <PublicationsSection
          publications={profile.publications}
          onChange={(publications) => setProfile((p) => ({ ...p, publications }))}
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Skills"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.skills.length}</span>}
      >
        <SkillsSection skills={profile.skills} onChange={(skills) => setProfile((p) => ({ ...p, skills }))} />
      </CollapsiblePanel>
    </div>
  );
}

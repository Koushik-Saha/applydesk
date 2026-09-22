"use client";

import type { MasterProfile } from "@applydesk/shared";
import { CollapsiblePanel } from "./collapsible-panel";
import { ContactSection } from "./contact-section";
import { SummarySection } from "./summary-section";
import { ExperienceSection } from "./experience-section";
import { ProjectsSection } from "./projects-section";
import { EducationSection } from "./education-section";
import { CertificationsSection } from "./certifications-section";
import { PublicationsSection } from "./publications-section";
import { SkillsSection } from "./skills-section";

// The 8 collapsible panels from DESIGN.md "Profile", shared by the regular
// profile editor and the import review screen.
export function ProfileSections({
  profile,
  onChange,
}: {
  profile: MasterProfile;
  onChange: (updater: (p: MasterProfile) => MasterProfile) => void;
}) {
  return (
    <>
      <CollapsiblePanel title="Contact">
        <ContactSection contact={profile.contact} onChange={(contact) => onChange((p) => ({ ...p, contact }))} />
      </CollapsiblePanel>

      <CollapsiblePanel title="Summary">
        <SummarySection summary={profile.summary} onChange={(summary) => onChange((p) => ({ ...p, summary }))} />
      </CollapsiblePanel>

      <CollapsiblePanel title="Experience" meta={<span className="font-mono text-xs">{profile.experiences.length}</span>}>
        <ExperienceSection
          experiences={profile.experiences}
          onChange={(experiences) => onChange((p) => ({ ...p, experiences }))}
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Projects"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.projects.length}</span>}
      >
        <ProjectsSection projects={profile.projects} onChange={(projects) => onChange((p) => ({ ...p, projects }))} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Education"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.education.length}</span>}
      >
        <EducationSection education={profile.education} onChange={(education) => onChange((p) => ({ ...p, education }))} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Certifications"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.certifications.length}</span>}
      >
        <CertificationsSection
          certifications={profile.certifications}
          onChange={(certifications) => onChange((p) => ({ ...p, certifications }))}
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Publications"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.publications.length}</span>}
      >
        <PublicationsSection
          publications={profile.publications}
          onChange={(publications) => onChange((p) => ({ ...p, publications }))}
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Skills"
        defaultOpen={false}
        meta={<span className="font-mono text-xs">{profile.skills.length}</span>}
      >
        <SkillsSection skills={profile.skills} onChange={(skills) => onChange((p) => ({ ...p, skills }))} />
      </CollapsiblePanel>
    </>
  );
}

"use client";

import { createId, type Project } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionList } from "./section-list";
import { BulletsEditor } from "./bullets-editor";

export function ProjectsSection({
  projects,
  onChange,
}: {
  projects: Project[];
  onChange: (next: Project[]) => void;
}) {
  return (
    <SectionList<Project>
      items={projects}
      onChange={onChange}
      createItem={() => ({ id: createId(), name: "", bullets: [] })}
      emptyLabel="No projects yet."
      addLabel="Add project"
      renderItem={(project, update) => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-text-muted">Name</Label>
              <Input value={project.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-text-muted">URL</Label>
              <Input value={project.url ?? ""} onChange={(e) => update({ url: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Description</Label>
            <Input
              value={project.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-2 block text-xs text-text-muted">Bullets</Label>
            <BulletsEditor bullets={project.bullets} onChange={(bullets) => update({ bullets })} />
          </div>
        </div>
      )}
    />
  );
}

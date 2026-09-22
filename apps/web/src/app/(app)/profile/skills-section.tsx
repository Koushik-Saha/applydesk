"use client";

import { createId, type Skill } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionList } from "./section-list";

export function SkillsSection({ skills, onChange }: { skills: Skill[]; onChange: (next: Skill[]) => void }) {
  return (
    <SectionList<Skill>
      items={skills}
      onChange={onChange}
      createItem={() => ({ id: createId(), name: "" })}
      emptyLabel="No skills yet."
      addLabel="Add skill"
      renderItem={(skill, update) => (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Name</Label>
            <Input value={skill.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Category</Label>
            <Input
              value={skill.category ?? ""}
              onChange={(e) => update({ category: e.target.value })}
              placeholder="Languages, Frameworks..."
            />
          </div>
        </div>
      )}
    />
  );
}

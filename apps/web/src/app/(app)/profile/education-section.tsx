"use client";

import { createId, type Education } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionList } from "./section-list";

export function EducationSection({
  education,
  onChange,
}: {
  education: Education[];
  onChange: (next: Education[]) => void;
}) {
  return (
    <SectionList<Education>
      items={education}
      onChange={onChange}
      createItem={() => ({ id: createId(), school: "", degree: "" })}
      emptyLabel="No education yet."
      addLabel="Add education"
      renderItem={(edu, update) => (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">School</Label>
            <Input value={edu.school} onChange={(e) => update({ school: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Degree</Label>
            <Input value={edu.degree} onChange={(e) => update({ degree: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Field of study</Label>
            <Input
              value={edu.fieldOfStudy ?? ""}
              onChange={(e) => update({ fieldOfStudy: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-text-muted">Start</Label>
              <Input value={edu.startDate ?? ""} onChange={(e) => update({ startDate: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-text-muted">End</Label>
              <Input value={edu.endDate ?? ""} onChange={(e) => update({ endDate: e.target.value })} />
            </div>
          </div>
        </div>
      )}
    />
  );
}

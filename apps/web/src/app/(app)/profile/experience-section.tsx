"use client";

import { createId, type Experience } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionList } from "./section-list";
import { BulletsEditor } from "./bullets-editor";

export function ExperienceSection({
  experiences,
  onChange,
}: {
  experiences: Experience[];
  onChange: (next: Experience[]) => void;
}) {
  return (
    <SectionList<Experience>
      items={experiences}
      onChange={onChange}
      createItem={() => ({
        id: createId(),
        company: "",
        title: "",
        startDate: "",
        current: false,
        bullets: [],
      })}
      emptyLabel="No experience yet."
      addLabel="Add role"
      renderItem={(exp, update) => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-text-muted">Company</Label>
              <Input value={exp.company} onChange={(e) => update({ company: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-text-muted">Title</Label>
              <Input value={exp.title} onChange={(e) => update({ title: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-text-muted">Location</Label>
              <Input value={exp.location ?? ""} onChange={(e) => update({ location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-text-muted">Start</Label>
                <Input
                  value={exp.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  placeholder="2020-01"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-text-muted">End</Label>
                <Input
                  value={exp.endDate ?? ""}
                  onChange={(e) => update({ endDate: e.target.value })}
                  placeholder="2023-06"
                  disabled={exp.current}
                />
              </div>
            </div>
          </div>

          <label className="flex w-fit items-center gap-2 text-sm">
            <Switch
              checked={exp.current}
              onCheckedChange={(current) => update({ current, endDate: current ? undefined : exp.endDate })}
            />
            Current role
          </label>

          <div>
            <Label className="mb-2 block text-xs text-text-muted">Bullets</Label>
            <BulletsEditor bullets={exp.bullets} onChange={(bullets) => update({ bullets })} />
          </div>
        </div>
      )}
    />
  );
}

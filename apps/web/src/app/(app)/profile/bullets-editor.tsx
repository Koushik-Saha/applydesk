"use client";

import { createId, extractMetrics, type Bullet } from "@applydesk/shared";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SectionList } from "./section-list";
import { TagInput } from "./tag-input";
import { MetricChips } from "./metric-chips";

export function BulletsEditor({ bullets, onChange }: { bullets: Bullet[]; onChange: (next: Bullet[]) => void }) {
  return (
    <SectionList<Bullet>
      items={bullets}
      onChange={onChange}
      createItem={() => ({ id: createId(), text: "", skills: [], metrics: [], tags: [] })}
      emptyLabel="No bullets yet."
      addLabel="Add bullet"
      renderItem={(bullet, update) => (
        <div className="flex flex-col gap-2">
          <Textarea
            value={bullet.text}
            onChange={(e) => {
              const text = e.target.value;
              update({ text, metrics: extractMetrics(text) });
            }}
            placeholder="Led a team of 5 to launch..."
            rows={2}
            className="text-sm"
          />
          <MetricChips metrics={bullet.metrics} />
          <div>
            <Label className="mb-1 text-xs text-text-muted">Skills</Label>
            <TagInput
              value={bullet.skills}
              onChange={(skills) => update({ skills })}
              placeholder="Add a skill and press Enter"
            />
          </div>
        </div>
      )}
    />
  );
}

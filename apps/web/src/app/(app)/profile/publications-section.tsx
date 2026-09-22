"use client";

import { createId, type Publication } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionList } from "./section-list";

export function PublicationsSection({
  publications,
  onChange,
}: {
  publications: Publication[];
  onChange: (next: Publication[]) => void;
}) {
  return (
    <SectionList<Publication>
      items={publications}
      onChange={onChange}
      createItem={() => ({ id: createId(), title: "" })}
      emptyLabel="No publications yet."
      addLabel="Add publication"
      renderItem={(pub, update) => (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Title</Label>
            <Input value={pub.title} onChange={(e) => update({ title: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Publisher</Label>
            <Input value={pub.publisher ?? ""} onChange={(e) => update({ publisher: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Date</Label>
            <Input value={pub.date ?? ""} onChange={(e) => update({ date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">URL</Label>
            <Input value={pub.url ?? ""} onChange={(e) => update({ url: e.target.value })} />
          </div>
        </div>
      )}
    />
  );
}

"use client";

import { createId, type Certification } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionList } from "./section-list";

export function CertificationsSection({
  certifications,
  onChange,
}: {
  certifications: Certification[];
  onChange: (next: Certification[]) => void;
}) {
  return (
    <SectionList<Certification>
      items={certifications}
      onChange={onChange}
      createItem={() => ({ id: createId(), name: "" })}
      emptyLabel="No certifications yet."
      addLabel="Add certification"
      renderItem={(cert, update) => (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Name</Label>
            <Input value={cert.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Issuer</Label>
            <Input value={cert.issuer ?? ""} onChange={(e) => update({ issuer: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">Date</Label>
            <Input value={cert.date ?? ""} onChange={(e) => update({ date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-muted">URL</Label>
            <Input value={cert.url ?? ""} onChange={(e) => update({ url: e.target.value })} />
          </div>
        </div>
      )}
    />
  );
}

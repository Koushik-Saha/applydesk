"use client";

import type { Contact } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: { key: keyof Contact; label: string; placeholder?: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "City, State" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "portfolio", label: "Portfolio" },
];

export function ContactSection({
  contact,
  onChange,
}: {
  contact: Contact;
  onChange: (next: Contact) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <Label htmlFor={`contact-${field.key}`} className="text-xs text-text-muted">
            {field.label}
          </Label>
          <Input
            id={`contact-${field.key}`}
            value={contact[field.key] ?? ""}
            onChange={(e) => onChange({ ...contact, [field.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

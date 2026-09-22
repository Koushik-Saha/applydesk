"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { standardAnswersSchema, type StandardAnswers } from "@applydesk/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const TEXT_FIELDS: { key: keyof StandardAnswers; label: string }[] = [
  { key: "legalName", label: "Legal name" },
  { key: "preferredName", label: "Preferred name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "cityState", label: "City, State" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "portfolio", label: "Portfolio" },
  { key: "workAuthorization", label: "Work authorization" },
  { key: "noticePeriod", label: "Notice period" },
  { key: "salaryExpectation", label: "Salary expectation" },
  { key: "pronouns", label: "Pronouns (optional)" },
];

const EEO_FIELDS: { key: keyof StandardAnswers["eeo"]; label: string }[] = [
  { key: "gender", label: "Gender" },
  { key: "race", label: "Race/ethnicity" },
  { key: "veteranStatus", label: "Veteran status" },
  { key: "disabilityStatus", label: "Disability status" },
];

export function StandardAnswersTab({ initialAnswers }: { initialAnswers: StandardAnswers }) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<StandardAnswers>({
    resolver: zodResolver(standardAnswersSchema),
    defaultValues: initialAnswers,
  });

  async function onSubmit(data: StandardAnswers) {
    setSaving(true);
    try {
      const res = await fetch("/api/standard-answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save standard answers.");
      toast.success("Standard answers saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save standard answers.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <Label htmlFor={`sa-${field.key}`} className="text-xs text-text-muted">
              {field.label}
            </Label>
            <Input id={`sa-${field.key}`} {...register(field.key)} />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <Label htmlFor="sa-years" className="text-xs text-text-muted">
            Years of experience
          </Label>
          <Input id="sa-years" type="number" {...register("yearsOfExperience", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={watch("sponsorshipNeeded")}
            onCheckedChange={(v) => setValue("sponsorshipNeeded", v, { shouldDirty: true })}
          />
          Needs sponsorship
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={watch("willingToRelocate")}
            onCheckedChange={(v) => setValue("willingToRelocate", v, { shouldDirty: true })}
          />
          Willing to relocate
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">EEO answers</p>
        <p className="mb-3 text-xs text-text-muted">Default: &ldquo;Decline to answer&rdquo;.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EEO_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <Label htmlFor={`eeo-${field.key}`} className="text-xs text-text-muted">
                {field.label}
              </Label>
              <Input id={`eeo-${field.key}`} {...register(`eeo.${field.key}`)} />
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-fit" disabled={!isDirty || saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ResumeContent, DocumentLint, DocumentValidation } from "@applydesk/shared";
import { BulletPair } from "@/components/bullet-pair";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export interface ResumeVersion {
  id: string;
  version: number;
  content: ResumeContent;
  lint: DocumentLint;
  validation: DocumentValidation;
  createdAt: string;
  status?: "draft" | "approved";
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  fileName?: string | null;
}

async function putJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message ?? "Failed to save.");
  }
  return res.json();
}

// DESIGN.md "Document editor" — split view (master left, tailored right,
// linked hover), version selector, before -> after coverage.
export function ResumeEditor({ versions, bulletTextById }: { versions: ResumeVersion[]; bulletTextById: Record<string, string> }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const version = versions[selectedIndex];
  const [content, setContent] = useState<ResumeContent | undefined>(version?.content);
  const dirty = content !== version?.content;

  const saveMutation = useMutation({
    mutationFn: () => putJson(`/api/documents/${version!.id}`, { content }),
    onSuccess: () => toast.success("Saved a new version."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save."),
  });

  const included = useMemo(() => content?.experiences.filter((e) => !e.summarized) ?? [], [content]);
  const summarized = useMemo(() => content?.experiences.filter((e) => e.summarized) ?? [], [content]);

  function updateBulletText(experienceId: string, bulletIndex: number, text: string) {
    if (!content) return;
    setContent({
      ...content,
      experiences: content.experiences.map((exp) =>
        exp.id !== experienceId
          ? exp
          : { ...exp, bullets: exp.bullets.map((b, i) => (i === bulletIndex ? { ...b, text } : b)) },
      ),
    });
  }

  if (!version || !content) {
    return <p className="text-sm text-text-muted">No resume generated yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedIndex}
          onChange={(e) => {
            const i = Number(e.target.value);
            setSelectedIndex(i);
            setContent(versions[i]?.content);
          }}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
        >
          {versions.map((v, i) => (
            <option key={v.id} value={i}>
              Version {v.version}
            </option>
          ))}
        </select>
        <span className="text-sm text-text-muted">
          Keyword coverage: <span className="font-mono">{content.keywordCoverage.before}%</span> {"->"}{" "}
          <span className="font-mono text-[var(--met)]">{content.keywordCoverage.after}%</span>
        </span>
        <Button size="sm" className="ml-auto gap-1.5" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending && <Spinner />}
          Save new version
        </Button>
      </div>

      {version.lint.warnings.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-600">
          {version.lint.warnings.map((w, i) => (
            <p key={i}>{w.message}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 border-b border-border pb-1 text-xs font-medium text-text-muted">
        <span>Master</span>
        <span>Tailored</span>
      </div>

      {included.map((exp) => (
        <div key={exp.id} className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {exp.title} · {exp.company}
          </p>
          {exp.bullets.map((bullet, i) => (
            <BulletPair
              key={i}
              masterText={bulletTextById[bullet.sourceBulletIds[0] ?? ""] ?? "(source unavailable)"}
              tailoredText={bullet.text}
              originalKept={bullet.originalKept}
              lintWarnings={bullet.lintWarnings}
              onChange={(text) => updateBulletText(exp.id, i, text)}
            />
          ))}
        </div>
      ))}

      {summarized.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm text-text-muted">
          <p className="text-xs font-medium">Earlier roles (summarized)</p>
          {summarized.map((exp) => (
            <p key={exp.id}>
              {exp.title} · {exp.company}
            </p>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3">
        <p className="mb-1 text-xs font-medium text-text-muted">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {content.skills.map((skill) => (
            <span key={skill} className="rounded-full border border-border px-2 py-0.5 text-xs">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

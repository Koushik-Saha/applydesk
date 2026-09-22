"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CoverLetterContent, DocumentLint, DocumentValidation } from "@applydesk/shared";
import { Button } from "@/components/ui/button";

export interface CoverLetterVersion {
  id: string;
  version: number;
  content: CoverLetterContent;
  lint: DocumentLint;
  validation: DocumentValidation;
  createdAt: string;
}

async function putJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message ?? "Failed to save.");
  }
  return res.json();
}

export function CoverLetterEditor({
  versions,
  bulletTextById,
}: {
  versions: CoverLetterVersion[];
  bulletTextById: Record<string, string>;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const version = versions[selectedIndex];
  const [content, setContent] = useState<CoverLetterContent | undefined>(version?.content);
  const dirty = content !== version?.content;

  const saveMutation = useMutation({
    mutationFn: () => putJson(`/api/documents/${version!.id}`, { content }),
    onSuccess: () => toast.success("Saved a new version."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save."),
  });

  if (!version || !content) {
    return <p className="text-sm text-text-muted">No cover letter generated yet.</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
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
        {content.originalKept && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">
            Original kept
          </span>
        )}
        <Button size="sm" className="ml-auto" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
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

      <p className="text-sm">{content.greeting}</p>
      {content.paragraphs.map((paragraph, i) => (
        <textarea
          key={i}
          value={paragraph}
          onChange={(e) =>
            setContent({ ...content, paragraphs: content.paragraphs.map((p, pi) => (pi === i ? e.target.value : p)) })
          }
          rows={4}
          className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed focus:border-border focus:bg-surface focus:outline-none"
        />
      ))}
      <p className="text-sm">{content.signOff}</p>

      {content.referencedBulletIds.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium text-text-muted">Referenced accomplishments</p>
          <ul className="flex flex-col gap-1 text-sm text-text-muted">
            {content.referencedBulletIds.map((id) => (
              <li key={id}>&ldquo;{bulletTextById[id] ?? id}&rdquo;</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { Download, Database } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function DataExportSettings() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
          <Database className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-medium text-text">Data Export & Backup</h2>
          <p className="text-xs text-text-muted">
            Download an offline archive of all your jobs, profiles, documents, and settings
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <p className="text-sm text-text-muted">
          Export your complete ApplyDesk database as a structured JSON file. Includes all master
          profile entries, voice samples, standard answers, job analyses, generated resume and cover
          letter contents, Drive links, and timeline events.
        </p>

        <div>
          <a
            href="/api/export"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-3.5 mr-1.5" />
            Export All Data (JSON)
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, ExternalLink, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface GoogleDriveSettingsProps {
  initialConnected: boolean;
  googleEmail: string | null;
  rootFolderId: string | null;
  connectedAt: string | null;
}

export function GoogleDriveSettings({
  initialConnected,
  googleEmail,
  rootFolderId,
  connectedAt,
}: GoogleDriveSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);

  const googleConnected = searchParams.get("google") === "connected";
  const googleError = searchParams.get("google_error");

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect Google Drive? New approved documents won't be synced until reconnected.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect.");
      toast.success("Google Drive disconnected.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <HardDrive className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-medium text-text">Google Drive</h2>
            <p className="text-xs text-text-muted">
              Store approved resumes and cover letters in dedicated job folders (scope: <code className="font-mono text-xs">drive.file</code>)
            </p>
          </div>
        </div>

        {initialConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-500/10 px-2.5 py-0.5 text-xs font-medium text-text-muted">
            Not connected
          </span>
        )}
      </div>

      {googleConnected && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Google Drive connected successfully. Root folder &ldquo;ApplyDesk&rdquo; is active.</span>
        </div>
      )}

      {googleError && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Connection failed ({googleError})</p>
            <p className="text-xs mt-0.5 text-rose-600 dark:text-rose-400">
              Please try connecting again with prompt consent. Ensure offline access is allowed.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {initialConnected ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-bg/50 p-3">
                <span className="text-xs text-text-muted block mb-1">Account Email</span>
                <span className="font-mono text-xs text-text font-medium">{googleEmail ?? "—"}</span>
              </div>
              <div className="rounded-lg border border-border bg-bg/50 p-3">
                <span className="text-xs text-text-muted block mb-1">Root Folder</span>
                <span className="text-xs text-text font-medium flex items-center gap-1.5">
                  ApplyDesk
                  {rootFolderId && (
                    <a
                      href={`https://drive.google.com/drive/folders/${rootFolderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent)] hover:underline inline-flex items-center gap-0.5 text-xs"
                    >
                      Open in Drive <ExternalLink className="size-3" />
                    </a>
                  )}
                </span>
              </div>
            </div>

            {connectedAt && (
              <p className="text-xs text-text-muted">
                Connected on {new Date(connectedAt).toLocaleDateString()}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <a
                href="/api/google/connect"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Reconnect
              </a>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="gap-1.5"
              >
                {disconnecting && <Spinner />}
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Connect your Google account so that when you approve tailored documents, ApplyDesk can automatically render ATS-safe PDFs and upload them to <span className="font-mono text-xs text-text">ApplyDesk/&lt;YYYY-MM&gt; &lt;Company&gt; — &lt;Job title&gt;/</span>.
            </p>
            <div>
              <a
                href="/api/google/connect"
                className={buttonVariants({ variant: "default" })}
              >
                Connect Google Drive
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

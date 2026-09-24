"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// PROJECT_SPEC.md §4.1 — "Import: upload my current resume PDF/DOCX ...
// Import runs once; after that I edit the profile directly." (Runnable
// again any time — it always lands on a review screen before saving.)
export function ImportUploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/import", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to import resume.");
      }
      const body = (await res.json()) as { taskId: string };
      setOpen(false);
      router.push(`/profile/import/${body.taskId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import resume.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Upload className="size-4" />
        Import resume
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import resume</DialogTitle>
          <DialogDescription>Upload a PDF or DOCX (max 5MB). You&apos;ll review the parsed result before it&apos;s saved.</DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
        <DialogFooter>
          <Button onClick={upload} disabled={!file || uploading} className="gap-1.5">
            {uploading && <Spinner />}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

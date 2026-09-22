"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// PROJECT_SPEC.md §4.2 — manual job add (paste URL + description). Wired to
// POST /api/jobs once the jobs API lands.
export function AddJobDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        Add job
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a job</DialogTitle>
          <DialogDescription>Paste the posting URL and description.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input placeholder="Job posting URL" disabled />
          <Textarea placeholder="Job description" rows={6} disabled />
        </div>
        <DialogFooter>
          <Button disabled>Save job</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

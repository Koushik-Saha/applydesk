"use client";

import { useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

// DESIGN.md §4 — topbar ⌘K placeholder. Wired to real search/actions in a later milestone.
export function CommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-text-muted"
        onClick={() => setOpen(true)}
      >
        Search
        <kbd className="rounded-sm border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="ApplyDesk">
        <Command>
          <CommandInput placeholder="Search jobs, go to a page..." />
          <CommandList>
            <CommandEmpty>Command palette coming soon.</CommandEmpty>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

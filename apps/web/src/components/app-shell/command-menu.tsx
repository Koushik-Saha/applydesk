"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  User,
  Settings,
  PlusCircle,
  FileText,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface SearchJob {
  id: string;
  company: string;
  title: string;
  score: number | null;
  status: string;
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const query = search.trim();
    const url = query ? `/api/jobs?q=${encodeURIComponent(query)}` : "/api/jobs";

    setSearching(true);
    fetch(url)
      .then((res) => (res.ok ? res.json() : { jobs: [] }))
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs ?? []);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, search]);

  function runCommand(command: () => void) {
    setOpen(false);
    startTransition(() => {
      command();
    });
  }

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
      <CommandDialog open={open} onOpenChange={setOpen} title="ApplyDesk Quick Search">
        <Command>
          <CommandInput
            placeholder="Search jobs, pages, actions..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
                <LayoutDashboard className="size-4 mr-2" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push("/jobs"))}>
                <Briefcase className="size-4 mr-2" />
                <span>All Jobs</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
                <User className="size-4 mr-2" />
                <span>Master Profile</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                <Settings className="size-4 mr-2" />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => runCommand(() => router.push("/jobs/new"))}>
                <PlusCircle className="size-4 mr-2 text-[var(--accent)]" />
                <span>Add new job posting</span>
              </CommandItem>
            </CommandGroup>

            {searching && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted">
                <Spinner className="size-3.5" />
                Searching jobs...
              </div>
            )}

            {jobs.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Jobs">
                  {jobs.slice(0, 8).map((job) => (
                    <CommandItem
                      key={job.id}
                      onSelect={() => runCommand(() => router.push(`/jobs/${job.id}`))}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="size-4 shrink-0 text-text-muted" />
                        <span className="font-medium text-text">{job.company}</span>
                        <span className="text-text-muted truncate">— {job.title}</span>
                      </div>
                      {typeof job.score === "number" && (
                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                          {job.score}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

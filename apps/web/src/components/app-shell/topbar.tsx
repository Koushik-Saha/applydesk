"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/app-shell/sidebar";
import { CommandMenu } from "@/components/app-shell/command-menu";
import { AddJobDialog } from "@/components/app-shell/add-job-dialog";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";

function pageTitle(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
  return match?.label ?? "ApplyDesk";
}

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <h1 className="text-lg font-semibold">{pageTitle(pathname)}</h1>
      <div className="flex items-center gap-2">
        <CommandMenu />
        <AddJobDialog />
        <ThemeToggle />
      </div>
    </header>
  );
}

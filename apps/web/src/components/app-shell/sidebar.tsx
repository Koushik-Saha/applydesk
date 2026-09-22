"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Briefcase, User, Settings, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// bg-[var(--accent)]/text-[var(--accent)] below use the raw token directly:
// the Tailwind "accent" utility key is claimed by shadcn's hover/selected-bg
// convention (globals.css), not DESIGN.md's brand teal.
export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const STORAGE_KEY = "applydesk:sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable — keep expanded
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 ease-out",
        collapsed ? "w-16" : "w-[232px]",
      )}
      aria-label="Primary"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-sm font-semibold text-primary-foreground">
          A
        </div>
        {!collapsed && <span className="truncate text-sm font-medium">ApplyDesk</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const link = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-accent-soft font-medium text-[var(--accent)]"
                  : "text-text-muted hover:bg-surface-muted hover:text-text",
              )}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (!collapsed) return link;

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger render={link} />
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggle}
          className={cn(!mounted && "invisible")}
        >
          <PanelLeft className="size-4" />
        </Button>
      </div>
    </aside>
  );
}

"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moveItem, removeItem, updateItem } from "./list-helpers";

interface SectionListProps<T extends { id: string }> {
  items: T[];
  onChange: (next: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  emptyLabel: string;
  addLabel: string;
}

// Shared "add / reorder / delete" chrome for every repeatable profile
// section (experiences, projects, education, certifications, publications,
// skills, and bullets within an experience/project).
export function SectionList<T extends { id: string }>({
  items,
  onChange,
  createItem,
  renderItem,
  emptyLabel,
  addLabel,
}: SectionListProps<T>) {
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-sm text-text-muted">{emptyLabel}</p>}
      {items.map((item, index) => (
        <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
          <div className="min-w-0 flex-1">
            {renderItem(item, (patch) => onChange(updateItem(items, item.id, patch)))}
          </div>
          <div className="flex shrink-0 flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => onChange(moveItem(items, index, -1))}
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Move down"
              disabled={index === items.length - 1}
              onClick={() => onChange(moveItem(items, index, 1))}
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Delete"
              onClick={() => onChange(removeItem(items, item.id))}
            >
              <Trash2 className="size-3.5 text-[var(--missing)]" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={() => onChange([...items, createItem()])}>
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

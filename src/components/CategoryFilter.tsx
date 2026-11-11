"use client";

import { motion } from "framer-motion";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getSound } from "@/lib/sound";
import { useApp } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";
import type { CategoryFilter as Filter } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  value: Filter;
  onChange: (category: Filter) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const { allChallenges } = useApp();

  const counts = new Map<string, number>();
  for (const c of allChallenges) {
    counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  }

  const items: Array<{ id: Filter; label: string; count: number; accent: string }> = [
    { id: "all", label: "All Categories", count: allChallenges.length, accent: "var(--accent)" },
    ...CATEGORIES.map((c) => ({
      id: c.id as Filter,
      label: c.label,
      count: counts.get(c.id) ?? 0,
      accent: c.accent,
    })),
  ];

  return (
    <div className="filter-rail" role="group" aria-label="Filter challenges by category">
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={cn("filter-chip", active && "is-active")}
            aria-pressed={active}
            style={{ "--chip": item.accent } as React.CSSProperties}
            onClick={() => {
              onChange(item.id);
              getSound().unlock();
              getSound().click();
            }}
          >
            {active ? (
              <motion.span
                layoutId="filter-active"
                className="filter-chip-bg"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className="filter-chip-inner">
              <CategoryIcon name={item.id} className="size-3.5" aria-hidden />
              <span className="filter-chip-label">{item.label}</span>
              <span className="filter-chip-count">{item.count}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
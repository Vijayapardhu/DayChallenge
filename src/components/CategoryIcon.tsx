import {
  FlaskConical,
  Gamepad2,
  LayoutGrid,
  Smartphone,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CategoryFilter, CategoryId } from "@/lib/types";

const ICONS: Record<CategoryId, LucideIcon> = {
  "mini-games": Gamepad2,
  "app-clones": Smartphone,
  systems: Wrench,
  "cool-features": Sparkles,
  experiments: FlaskConical,
};

export const ALL_ICON = LayoutGrid;

export interface CategoryIconProps {
  name: CategoryFilter | CategoryId;
  className?: string;
  strokeWidth?: number;
}

export function CategoryIcon({
  name,
  className,
  strokeWidth = 2,
}: CategoryIconProps) {
  const Icon = name === "all" ? ALL_ICON : ICONS[name] ?? ALL_ICON;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
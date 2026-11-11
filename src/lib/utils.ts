import type { Challenge, Difficulty } from "@/lib/types";

/** Minimal className joiner (keeps the bundle free of extra deps). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

/** FNV-1a — small, fast, stable across runs (used for the daily pick). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Local calendar day as YYYY-MM-DD (the daily seed). */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatHours(hours: number): string {
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

export function formatRelativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

export function difficultyWeight(d: Difficulty): number {
  return DIFFICULTY_WEIGHT[d];
}

/** Case-insensitive fuzzy-ish search over name, tagline, description, stack. */
export function matchesQuery(challenge: Challenge, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    challenge.name,
    challenge.tagline,
    challenge.description,
    challenge.category,
    challenge.difficulty,
    challenge.techStack.join(" "),
    challenge.mvpFeatures.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  // every whitespace-separated term must appear somewhere
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function pickRandom<T>(items: readonly T[], exclude?: (item: T) => boolean): T | null {
  if (items.length === 0) return null;
  const pool = exclude ? items.filter((i) => !exclude(i)) : items.slice();
  const usable = pool.length > 0 ? pool : items;
  return usable[Math.floor(Math.random() * usable.length)] ?? null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

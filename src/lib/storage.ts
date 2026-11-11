"use client";

import type {
  Challenge,
  CompletedRecord,
  SpinRecord,
} from "@/lib/types";

export const STORAGE_KEYS = {
  history: "civi.history.v1",
  completed: "civi.completed.v1",
  custom: "civi.custom.v1",
  seen: "civi.seen.v1",
  sound: "civi.sound.v1",
  prefs: "civi.prefs.v1",
  checks: "civi.checks.v1",
} as const;

export const MAX_HISTORY = 60;
export const MAX_SEEN = 400;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — fail quietly, the app still works */
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export interface SoundPrefs {
  muted: boolean;
  volume: number;
}

export const DEFAULT_SOUND: SoundPrefs = { muted: false, volume: 0.7 };

export interface AppPrefs {
  category: string;
  mode: string;
}

export const DEFAULT_PREFS: AppPrefs = {
  category: "all",
  mode: "random",
};

export type HistoryStore = SpinRecord[];
export type CompletedStore = CompletedRecord[];
export type CustomStore = Challenge[];
/** Ids of challenges already surfaced, used by "unique" mode. */
export type SeenStore = string[];
/** challengeId → indices of MVP features the user has ticked off. */
export type CheckStore = Record<string, number[]>;

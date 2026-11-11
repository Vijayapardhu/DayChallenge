"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CHALLENGES } from "@/data/challenges";
import { getSound } from "@/lib/sound";
import {
  DEFAULT_PREFS,
  DEFAULT_SOUND,
  MAX_HISTORY,
  MAX_SEEN,
  readJSON,
  removeKey,
  STORAGE_KEYS,
  writeJSON,
  type AppPrefs,
  type CheckStore,
  type CompletedStore,
  type CustomStore,
  type HistoryStore,
  type SeenStore,
  type SoundPrefs,
} from "@/lib/storage";
import type {
  CategoryFilter,
  Challenge,
  CompletedRecord,
  SpinMode,
  SpinRecord,
} from "@/lib/types";

export interface SpinResult {
  challenge: Challenge;
  mode: SpinMode;
  at: number;
}

export interface AppContextValue {
  hydrated: boolean;
  /** Curated + user-authored challenges, in that order. */
  allChallenges: Challenge[];
  custom: Challenge[];
  history: SpinRecord[];
  completed: CompletedRecord[];
  seen: string[];
  sound: SoundPrefs;
  prefs: AppPrefs;
  result: SpinResult | null;
  setResult: (result: SpinResult | null) => void;
  addCustom: (challenge: Challenge) => void;
  removeCustom: (id: string) => void;
  recordSpin: (record: Omit<SpinRecord, "id">) => void;
  clearHistory: () => void;
  isCompleted: (id: string) => boolean;
  markCompleted: (challenge: Challenge) => void;
  unmarkCompleted: (id: string) => void;
  clearCompleted: () => void;
  markSeen: (ids: string[]) => void;
  setSound: (patch: Partial<SoundPrefs>) => void;
  setCategory: (category: CategoryFilter) => void;
  setMode: (mode: SpinMode) => void;
  isChecked: (challengeId: string, index: number) => boolean;
  toggleCheck: (challengeId: string, index: number) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [custom, setCustom] = useState<CustomStore>([]);
  const [history, setHistory] = useState<HistoryStore>([]);
  const [completed, setCompleted] = useState<CompletedStore>([]);
  const [seen, setSeen] = useState<SeenStore>([]);
  const [checks, setChecks] = useState<CheckStore>({});
  const [sound, setSoundState] = useState<SoundPrefs>(DEFAULT_SOUND);
  const [prefs, setPrefsState] = useState<AppPrefs>(DEFAULT_PREFS);
  const [result, setResult] = useState<SpinResult | null>(null);

  // --- hydrate once on the client -----------------------------------------
  useEffect(() => {
    setCustom(readJSON<CustomStore>(STORAGE_KEYS.custom, []));
    setHistory(readJSON<HistoryStore>(STORAGE_KEYS.history, []));
    setCompleted(readJSON<CompletedStore>(STORAGE_KEYS.completed, []));
    setSeen(readJSON<SeenStore>(STORAGE_KEYS.seen, []));
    setChecks(readJSON<CheckStore>(STORAGE_KEYS.checks, {}));
    setSoundState(readJSON<SoundPrefs>(STORAGE_KEYS.sound, DEFAULT_SOUND));
    setPrefsState(readJSON<AppPrefs>(STORAGE_KEYS.prefs, DEFAULT_PREFS));
    setHydrated(true);
  }, []);

  // --- keep the audio engine in sync with persisted prefs ------------------
  useEffect(() => {
    const engine = getSound();
    engine.setVolume(sound.volume);
    engine.setMuted(sound.muted);
  }, [sound]);

  // --- persist after hydration -------------------------------------------
  const first = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (first.current) {
      first.current = false;
      return;
    }
    writeJSON(STORAGE_KEYS.custom, custom);
  }, [custom, hydrated]);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.history, history.slice(0, MAX_HISTORY));
  }, [history, hydrated]);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.completed, completed);
  }, [completed, hydrated]);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.seen, seen.slice(-MAX_SEEN));
  }, [seen, hydrated]);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.sound, sound);
  }, [sound, hydrated]);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.prefs, prefs);
  }, [prefs, hydrated]);

  useEffect(() => {
    if (hydrated) writeJSON(STORAGE_KEYS.checks, checks);
  }, [checks, hydrated]);

  // --- actions ------------------------------------------------------------
  const addCustom = useCallback((challenge: Challenge) => {
    setCustom((prev) => [{ ...challenge, custom: true }, ...prev]);
  }, []);

  const removeCustom = useCallback((id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id));
    setHistory((prev) => prev.filter((h) => h.challengeId !== id));
    setCompleted((prev) => prev.filter((c) => c.challengeId !== id));
    setSeen((prev) => prev.filter((s) => s !== id));
    setChecks((prev) => {
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const recordSpin = useCallback((record: Omit<SpinRecord, "id">) => {
    setHistory((prev) =>
      [
        {
          ...record,
          id: `spin-${record.at}-${Math.random().toString(36).slice(2, 6)}`,
        },
        ...prev,
      ].slice(0, MAX_HISTORY),
    );
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const isCompleted = useCallback(
    (id: string) => completed.some((c) => c.challengeId === id),
    [completed],
  );

  const markCompleted = useCallback((challenge: Challenge) => {
    setCompleted((prev) => {
      if (prev.some((c) => c.challengeId === challenge.id)) return prev;
      return [
        {
          challengeId: challenge.id,
          name: challenge.name,
          category: challenge.category,
          at: Date.now(),
        },
        ...prev,
      ];
    });
  }, []);

  const unmarkCompleted = useCallback((id: string) => {
    setCompleted((prev) => prev.filter((c) => c.challengeId !== id));
  }, []);

  const clearCompleted = useCallback(() => setCompleted([]), []);

  const markSeen = useCallback((ids: string[]) => {
    setSeen((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return Array.from(next).slice(-MAX_SEEN);
    });
  }, []);

  const setSound = useCallback((patch: Partial<SoundPrefs>) => {
    setSoundState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setCategory = useCallback((category: CategoryFilter) => {
    setPrefsState((prev) => ({ ...prev, category }));
  }, []);

  const setMode = useCallback((mode: SpinMode) => {
    setPrefsState((prev) => ({ ...prev, mode }));
  }, []);

  const isChecked = useCallback(
    (challengeId: string, index: number) =>
      (checks[challengeId] ?? []).includes(index),
    [checks],
  );

  const toggleCheck = useCallback((challengeId: string, index: number) => {
    setChecks((prev) => {
      const current = prev[challengeId] ?? [];
      const next = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];
      const copy = { ...prev };
      if (next.length === 0) delete copy[challengeId];
      else copy[challengeId] = next;
      return copy;
    });
  }, []);

  const resetAll = useCallback(() => {
    removeKey(STORAGE_KEYS.history);
    removeKey(STORAGE_KEYS.completed);
    removeKey(STORAGE_KEYS.custom);
    removeKey(STORAGE_KEYS.seen);
    removeKey(STORAGE_KEYS.checks);
    setHistory([]);
    setCompleted([]);
    setCustom([]);
    setSeen([]);
    setChecks({});
    setResult(null);
  }, []);

  const allChallenges = useMemo<Challenge[]>(
    () => [...custom, ...CHALLENGES],
    [custom],
  );

  // Track ids already surfaced for "unique" mode (ref keeps it out of deps).
  const seenRef = useRef(seen);
  seenRef.current = seen;

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      allChallenges,
      custom,
      history,
      completed,
      seen,
      sound,
      prefs,
      result,
      setResult,
      addCustom,
      removeCustom,
      recordSpin,
      clearHistory,
      isCompleted,
      markCompleted,
      unmarkCompleted,
      clearCompleted,
      markSeen,
      setSound,
      setCategory,
      setMode,
      isChecked,
      toggleCheck,
      resetAll,
    }),
    [
      hydrated,
      allChallenges,
      custom,
      history,
      completed,
      seen,
      sound,
      prefs,
      result,
      addCustom,
      removeCustom,
      recordSpin,
      clearHistory,
      isCompleted,
      markCompleted,
      unmarkCompleted,
      clearCompleted,
      markSeen,
      setSound,
      setCategory,
      setMode,
      isChecked,
      toggleCheck,
      resetAll,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

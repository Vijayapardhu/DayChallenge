"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  Dices,
  History,
  Layers3,
  LibraryBig,
  Shuffle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { ChallengeLibrary } from "@/components/ChallengeLibrary";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CompletedPanel } from "@/components/CompletedPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { Lever } from "@/components/Lever";
import { Particles } from "@/components/Particles";
import { PromptModal } from "@/components/PromptModal";
import { ResultCard } from "@/components/ResultCard";
import { RouletteReel, type SpinRequest } from "@/components/RouletteReel";
import { SoundControls } from "@/components/SoundControls";
import { getDailyChallenge } from "@/lib/daily";
import { getSound } from "@/lib/sound";
import { useApp } from "@/lib/store";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/types";
import type {
  CategoryFilter as CategoryFilterType,
  Challenge,
  SpinMode,
} from "@/lib/types";
import { cn, todayKey } from "@/lib/utils";

type Tab = "library" | "history" | "completed";

const MODES: Array<{ id: SpinMode; label: string; icon: typeof Shuffle; hint: string }> = [
  { id: "random", label: "Random", icon: Shuffle, hint: "Any project in the current filter" },
  { id: "unique", label: "Unique", icon: Sparkles, hint: "Avoids projects you already spun" },
  { id: "daily", label: "Daily", icon: CalendarDays, hint: "The same challenge all day, every day" },
];

export function ArcadeApp() {
  const app = useApp();
  const {
    allChallenges,
    seen,
    history,
    completed,
    prefs,
    setCategory,
    setMode,
    recordSpin,
    markSeen,
    result,
    setResult,
  } = app;

  const prefersReduced = useReducedMotion();
  const reducedMotion = Boolean(prefersReduced);

  const category = (prefs.category as CategoryFilterType) ?? "all";
  const mode = (prefs.mode as SpinMode) ?? "random";

  const pool = useMemo(() => {
    if (category === "all") return allChallenges;
    const filtered = allChallenges.filter((c) => c.category === category);
    return filtered.length > 0 ? filtered : allChallenges;
  }, [allChallenges, category]);

  const poolIds = useMemo(() => new Set(pool.map((c) => c.id)), [pool]);

  const [itemHeight, setItemHeight] = useState(72);
  const [spinRequest, setSpinRequest] = useState<SpinRequest | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [confettiToken, setConfettiToken] = useState(0);
  const [promptChallenge, setPromptChallenge] = useState<Challenge | null>(null);
  const [tab, setTab] = useState<Tab>("library");
  const [daily, setDaily] = useState<Challenge | null>(null);

  const machineRef = useRef<HTMLDivElement | null>(null);
  const spinningRef = useRef(false);
  const pendingModeRef = useRef<SpinMode>("random");
  const tokenRef = useRef(0);

  // Keep the latest state available to the (stable) keyboard handler.
  const stateRef = useRef({ pool, mode, seen, category, allChallenges });
  stateRef.current = { pool, mode, seen, category, allChallenges };

  /* ---------------- layout / daily -------------------------------------- */
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setItemHeight(w < 420 ? 52 : w < 640 ? 58 : w < 1024 ? 66 : 74);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => {
    setDaily(getDailyChallenge(todayKey()));
  }, []);

  /* ---------------- spin orchestration ---------------------------------- */
  const doSpin = useCallback(
    (target: Challenge, spinMode: SpinMode) => {
      const engine = getSound();
      engine.unlock();
      engine.click();
      engine.spinStart();
      spinningRef.current = true;
      pendingModeRef.current = spinMode;
      setSpinning(true);
      setResult(null);
      tokenRef.current += 1;
      setSpinRequest({ target, token: tokenRef.current });
    },
    [setResult],
  );

  const requestSpin = useCallback(
    (override?: SpinMode) => {
      if (spinningRef.current) return;
      const engine = getSound();
      engine.unlock();
      const s = stateRef.current;
      const nextMode = override ?? s.mode;

      if (nextMode === "daily") {
        const pick = getDailyChallenge(todayKey());
        if (s.category !== "all") setCategory("all");
        doSpin(pick, "daily");
        return;
      }

      const list = s.pool.length > 0 ? s.pool : s.allChallenges;
      let target: Challenge | undefined;

      if (nextMode === "unique") {
        const alreadySeen = new Set(s.seen);
        const fresh = list.filter((c) => !alreadySeen.has(c.id));
        const from = fresh.length > 0 ? fresh : list;
        target = from[Math.floor(Math.random() * from.length)];
      } else {
        target = list[Math.floor(Math.random() * list.length)];
      }

      if (!target) return;
      doSpin(target, nextMode);
    },
    [doSpin, setCategory],
  );

  const handleComplete = useCallback(
    (target: Challenge) => {
      const engine = getSound();
      engine.impact();
      window.setTimeout(() => engine.victory(), 120);
      const at = Date.now();
      const spinMode = pendingModeRef.current;
      setResult({ challenge: target, mode: spinMode, at });
      recordSpin({
        challengeId: target.id,
        name: target.name,
        category: target.category,
        difficulty: target.difficulty,
        hours: target.hours,
        mode: spinMode,
        at,
      });
      markSeen([target.id]);
      spinningRef.current = false;
      setSpinning(false);
      setConfettiToken((n) => n + 1);
    },
    [markSeen, recordSpin, setResult],
  );

  const spinSpecific = useCallback(
    (challenge: Challenge) => {
      if (spinningRef.current) return;
      if (!poolIds.has(challenge.id)) setCategory("all");
      doSpin(challenge, "random");
      machineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [doSpin, poolIds, setCategory],
  );

  const handleSpinAgain = useCallback(() => {
    requestSpin(stateRef.current.mode === "daily" ? "random" : stateRef.current.mode);
  }, [requestSpin]);

  /* ---------------- keyboard ------------------------------------------- */
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      const key = e.key;
      if (key === " " || key === "Spacebar") {
        e.preventDefault();
        requestSpin();
        return;
      }
      switch (key.toLowerCase()) {
        case "l":
          e.preventDefault();
          requestSpin();
          break;
        case "m":
          getSound().unlock();
          app.setSound({ muted: !app.sound.muted });
          break;
        case "r":
          requestSpin("random");
          break;
        case "u":
          requestSpin("unique");
          break;
        case "d":
          requestSpin("daily");
          break;
        case "0":
          setCategory("all");
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          setCategory(CATEGORIES[Number(key) - 1].id);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app, requestSpin, setCategory]);

  const completedIds = useMemo(
    () => new Set(completed.map((c) => c.challengeId)),
    [completed],
  );

  const unseen = useMemo(() => {
    const seenSet = new Set(seen);
    return pool.filter((c) => !seenSet.has(c.id)).length;
  }, [pool, seen]);

  const activeCat = category === "all" ? null : CATEGORY_MAP[category];

  return (
    <div className="arcade-shell">
      <Particles reducedMotion={reducedMotion} />
      <div className="arcade-veil" aria-hidden />

      <div className="arcade-content">
        <header className="arcade-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              <Dices className="size-6" />
            </span>
            <div className="brand-text">
              <h1 className="brand-title">Can I Vibecode It?</h1>
              <p className="brand-sub">
                One-day coding challenge roulette
              </p>
            </div>
          </div>
          <div className="header-tools">
            <SoundControls />
          </div>
        </header>

        <div className="stat-strip">
          <span className="stat-strip-item">
            <Layers3 className="size-3.5" aria-hidden />
            {allChallenges.length} projects
          </span>
          <span className="stat-strip-item">
            <Trophy className="size-3.5" aria-hidden />
            {completed.length} shipped
          </span>
          <span className="stat-strip-item">
            <History className="size-3.5" aria-hidden />
            {history.length} spins
          </span>
          <button
            type="button"
            className="daily-pill"
            onClick={() => requestSpin("daily")}
            title="Spin the challenge of the day"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            <span className="daily-pill-label">Daily</span>
            <span className="daily-pill-name">{daily ? daily.name : "…"}</span>
            <ArrowUpRight className="size-3.5" aria-hidden />
          </button>
        </div>

        {/* ------------------------- machine ------------------------- */}
        <CategoryFilter value={category} onChange={setCategory} />

        <section
          className="machine"
          ref={machineRef}
          aria-label="Challenge roulette machine"
        >
          <span className="machine-screws" aria-hidden />
          <div className="machine-bulbs" aria-hidden>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="bulb"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>

          <div className="machine-plate">
            <span>Vibecode Roulette</span>
            <em>
              {activeCat ? activeCat.label : "All categories"} · {pool.length} in the
              wheel
            </em>
          </div>

          <div className="machine-main">
            <div className="reel-shell">
              <span className="reel-side-label reel-side-label-left" aria-hidden>
                Spin
              </span>
              <RouletteReel
                pool={pool}
                spinRequest={spinRequest}
                reducedMotion={reducedMotion}
                itemHeight={itemHeight}
                completedIds={completedIds}
                onTick={(v) => getSound().tick(v)}
                onSlowdown={() => getSound().slowdown()}
                onComplete={handleComplete}
              />
              <span className="reel-side-label reel-side-label-right" aria-hidden>
                Build
              </span>
              <span className="reel-swipe-hint" aria-hidden>
                pull the lever or tap spin
              </span>
            </div>

            <div className="lever-shell">
              <Lever
                onPull={() => requestSpin()}
                disabled={spinning}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>

          <div className="machine-controls">
            <div className="mode-switch" role="group" aria-label="Spin mode">
              {MODES.map(({ id, label, icon: Icon, hint }) => (
                <button
                  key={id}
                  type="button"
                  className={cn("mode-button", mode === id && "is-active")}
                  aria-pressed={mode === id}
                  title={hint}
                  onClick={() => {
                    setMode(id);
                    getSound().click();
                  }}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="spin-button"
              onClick={() => requestSpin()}
              disabled={spinning}
              aria-label="Spin the roulette"
            >
              <span className="spin-button-glow" aria-hidden />
              <span className="spin-button-text">
                {spinning ? "Spinning…" : "SPIN"}
              </span>
              <span className="spin-button-sub">
                {mode === "unique"
                  ? `${unseen} unseen`
                  : mode === "daily"
                    ? todayKey()
                    : `${pool.length} in pool`}
              </span>
            </button>
          </div>
        </section>

        {/* ------------------------- result ------------------------- */}
        <div className="result-region" aria-live="polite" aria-atomic="false">
          <AnimatePresence mode="wait">
            {result && !spinning ? (
              <ResultCard
                key={result.at}
                result={result}
                confettiToken={confettiToken}
                reducedMotion={reducedMotion}
                onSpinAgain={handleSpinAgain}
                onGeneratePrompt={(c) => setPromptChallenge(c)}
              />
            ) : (
              <motion.p
                key="idle"
                className="result-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {spinning
                  ? "Fate is picking a project…"
                  : "Pull the lever — your next one-day build is one spin away."}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ------------------------- tabs -------------------------- */}
        <section className="tabs-section">
          <div className="tabs" role="tablist" aria-label="Challenge views">
            <button
              type="button"
              role="tab"
              id="tab-library"
              aria-selected={tab === "library"}
              aria-controls="panel-library"
              className={cn("tab", tab === "library" && "is-active")}
              onClick={() => setTab("library")}
            >
              <LibraryBig className="size-4" aria-hidden />
              Library
              <span className="tab-count">{allChallenges.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-history"
              aria-selected={tab === "history"}
              aria-controls="panel-history"
              className={cn("tab", tab === "history" && "is-active")}
              onClick={() => setTab("history")}
            >
              <History className="size-4" aria-hidden />
              History
              <span className="tab-count">{history.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-completed"
              aria-selected={tab === "completed"}
              aria-controls="panel-completed"
              className={cn("tab", tab === "completed" && "is-active")}
              onClick={() => setTab("completed")}
            >
              <Trophy className="size-4" aria-hidden />
              Completed
              <span className="tab-count">{completed.length}</span>
            </button>
          </div>

          <div className="tab-panel" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === "library" ? (
              <ChallengeLibrary onSpinChallenge={spinSpecific} />
            ) : tab === "history" ? (
              <HistoryPanel onRespin={spinSpecific} />
            ) : (
              <CompletedPanel />
            )}
          </div>
        </section>

        <footer className="arcade-footer">
          <span>
            <kbd>Space</kbd> spin · <kbd>1</kbd>–<kbd>5</kbd> filter · <kbd>D</kbd>{" "}
            daily · <kbd>U</kbd> unique · <kbd>M</kbd> mute
          </span>
          <span className="footer-note">
            Every project is scoped to ship in 1–8 hours with an AI assistant.
          </span>
        </footer>
      </div>

      <PromptModal
        challenge={promptChallenge}
        onClose={() => setPromptChallenge(null)}
      />
    </div>
  );
}
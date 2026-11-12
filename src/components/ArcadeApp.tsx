"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Code2,
  History,
  Layers3,
  LibraryBig,
  RotateCw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import { ChallengeLibrary } from "@/components/ChallengeLibrary";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CompletedPanel } from "@/components/CompletedPanel";
import { Drawer } from "@/components/Drawer";
import { HistoryPanel } from "@/components/HistoryPanel";
import { PromptModal } from "@/components/PromptModal";
import { ResultCard } from "@/components/ResultCard";
import { RouletteReel, type SpinRequest } from "@/components/RouletteReel";
import { SoundControls } from "@/components/SoundControls";
import { getDailyChallenge } from "@/lib/daily";
import { getSound } from "@/lib/sound";
import { registerOverlay } from "@/lib/overlays";
import { useApp } from "@/lib/store";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/types";
import type {
  CategoryFilter as CategoryFilterType,
  Challenge,
  SpinMode,
} from "@/lib/types";
import { cn, formatHours, todayKey } from "@/lib/utils";

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

  const [spinRequest, setSpinRequest] = useState<SpinRequest | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [promptChallenge, setPromptChallenge] = useState<Challenge | null>(null);
  const [tab, setTab] = useState<Tab>("library");
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** Whether the result is popped over the stage. */
  const [resultOpen, setResultOpen] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const spinningRef = useRef(false);
  const pendingModeRef = useRef<SpinMode>("random");
  const tokenRef = useRef(0);

  // Keep the latest state available to the (stable) keyboard handler.
  const stateRef = useRef({ pool, mode, seen, category, allChallenges });

  // The daily pick is deterministic for the day, so it is safe to compute
  // once on the client rather than storing it in state.
  const daily = useMemo(() => getDailyChallenge(todayKey()), []);

  useEffect(() => {
    stateRef.current = { pool, mode, seen, category, allChallenges };
  }, [pool, mode, seen, category, allChallenges]);

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
      setResultOpen(true);
    },
    [markSeen, recordSpin, setResult],
  );

  const spinSpecific = useCallback(
    (challenge: Challenge) => {
      if (spinningRef.current) return;
      if (!poolIds.has(challenge.id)) setCategory("all");
      setDrawerOpen(false);
      doSpin(challenge, "random");
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [doSpin, poolIds, setCategory],
  );

  const handleSpinAgain = useCallback(() => {
    setResultOpen(false);
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
      // The drawer owns the keyboard while it is open (Escape closes it).
      if (drawerOpen) return;

      const key = e.key;
      if (key === " " || key === "Spacebar") {
        e.preventDefault();
        requestSpin();
        return;
      }
      switch (key.toLowerCase()) {
        case "r":
          requestSpin("random");
          break;
        case "u":
          requestSpin("unique");
          break;
        case "d":
          requestSpin("daily");
          break;
        case "m":
          getSound().unlock();
          app.setSound({ muted: !app.sound.muted });
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
  }, [app, requestSpin, setCategory, drawerOpen]);

  const unseen = useMemo(() => {
    const seenSet = new Set(seen);
    return pool.filter((c) => !seenSet.has(c.id)).length;
  }, [pool, seen]);

  const activeCat = category === "all" ? null : CATEGORY_MAP[category];
  const landed = result && !spinning ? result.challenge : null;
  const showResult = Boolean(landed) && resultOpen;

  /* ---------------- overlays -------------------------------------------- */
  // Stable identities, so the overlay stack is not rebuilt on every render.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeResult = useCallback(() => setResultOpen(false), []);
  const closePrompt = useCallback(() => setPromptChallenge(null), []);

  // The result pop is the top-most overlay while it is up.
  useEffect(() => {
    if (!showResult) return;
    return registerOverlay(closeResult);
  }, [showResult, closeResult]);

  return (
    <div className="arcade-shell">
      {/* ------------------------- stage ------------------------- */}
      <div className={cn("stage", showResult && "is-result")} ref={stageRef}>
        <div className="stage-bar">
          <span className="stage-logo" aria-hidden>
            <Code2 className="size-5" />
          </span>
          <div className="stage-tools">
            <button
              type="button"
              className="stage-toggle"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open controls, library and challenge details"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              title="Controls & library"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        </div>

        <div className="stage-inner">
          <header className="stage-head">
            <h1 className="stage-title">Can I Vibecode It?</h1>
            <p className="stage-sub">Spin. Build. Done.</p>
          </header>

          <RouletteReel
            pool={pool}
            spinRequest={spinRequest}
            reducedMotion={reducedMotion}
            onTick={(v) => getSound().tick(v)}
            onSlowdown={() => getSound().slowdown()}
            onComplete={handleComplete}
          />

          <button
            type="button"
            className="spin-button"
            onClick={() => requestSpin()}
            disabled={spinning}
            aria-label="Spin the roulette"
          >
            <span className="spin-button-text">
              {spinning ? "Spinning" : "Spin"}
            </span>
            <ArrowRight className="size-4 spin-button-arrow" aria-hidden />
          </button>

          {mode === "random" ? null : (
            <button
              type="button"
              className="spin-mode"
              onClick={() => setDrawerOpen(true)}
              title="Change spin mode"
            >
              {mode === "daily"
                ? "daily challenge"
                : `unseen only · ${unseen}`}
            </button>
          )}
        </div>
      </div>

      {/* ------------------------- result ------------------------ */}
      <AnimatePresence>
        {showResult ? (
          <motion.div
            className="stage-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Selected challenge: ${landed?.name ?? ""}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeResult();
            }}
          >
            <motion.div
              className="result-pop"
              initial={{ opacity: 0, scale: 0.86, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <span className="result-pop-name">{landed?.name}</span>
              <span className="result-pop-meta">
                {landed
                  ? `${CATEGORY_MAP[landed.category].label} · ${formatHours(landed.hours)} · ${landed.difficulty}`
                  : ""}
              </span>
              <div className="result-pop-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSpinAgain}
                >
                  <RotateCw className="size-4" />
                  Spin Again
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    closeResult();
                    setDrawerOpen(true);
                  }}
                >
                  Details
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    closeResult();
                    setPromptChallenge(landed ?? null);
                  }}
                >
                  <Wand2 className="size-4" />
                  AI Build Prompt
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ------------------------- drawer ------------------------ */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Can I Vibecode It?"
      >
        <div className="drawer-section">
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
          </div>

          <button
            type="button"
            className="daily-pill"
            onClick={() => {
              setDrawerOpen(false);
              requestSpin("daily");
            }}
            title="Spin the challenge of the day"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            <span className="daily-pill-label">Daily</span>
            <span className="daily-pill-name">
              {daily ? daily.name : "…"}
            </span>
            <ArrowUpRight className="size-3.5" aria-hidden />
          </button>
        </div>

        <div className="drawer-section">
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

          <p className="drawer-note">
            {activeCat ? activeCat.label : "All categories"} · {pool.length} in the
            wheel
          </p>

          <CategoryFilter value={category} onChange={setCategory} />
        </div>

        <div className="drawer-section">
          <AnimatePresence mode="wait">
            {result && !spinning ? (
              <ResultCard
                key={result.at}
                result={result}
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
                Spin the roulette to get a project.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="drawer-section">
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

          <div
            className="tab-panel"
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
          >
            {tab === "library" ? (
              <ChallengeLibrary onSpinChallenge={spinSpecific} />
            ) : tab === "history" ? (
              <HistoryPanel onRespin={spinSpecific} />
            ) : (
              <CompletedPanel />
            )}
          </div>
        </div>

        <div className="drawer-section drawer-foot">
          <SoundControls />
          <p className="drawer-note">
            <kbd>Space</kbd> spin · <kbd>1</kbd>–<kbd>5</kbd> filter ·{" "}
            <kbd>D</kbd> daily · <kbd>U</kbd> unique · <kbd>M</kbd> mute
          </p>
          <p className="drawer-note">
            Every project is scoped to ship in 1–8 hours with an AI assistant.
          </p>
        </div>
      </Drawer>

      <PromptModal
        challenge={promptChallenge}
        onClose={closePrompt}
      />
    </div>
  );
}

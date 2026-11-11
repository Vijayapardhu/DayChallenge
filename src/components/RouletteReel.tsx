"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  buildSpinPlan,
  buildStrip,
  CENTER_SLOT,
  decelStart,
  makeProgress,
  makeVelocity,
  modIndex,
  VISIBLE_ROWS,
  type SpinPlan,
} from "@/lib/roulette";
import { CATEGORY_MAP } from "@/lib/types";
import type { Challenge } from "@/lib/types";

export interface SpinRequest {
  target: Challenge;
  /** Bump this to fire a spin; the value itself is the trigger. */
  token: number;
}

interface ReelRun {
  plan: SpinPlan;
  startIndex: number;
  base: number;
}

interface RouletteReelProps {
  pool: Challenge[];
  spinRequest: SpinRequest | null;
  reducedMotion: boolean;
  itemHeight: number;
  completedIds: Set<string>;
  onTick: (velocity: number) => void;
  onSlowdown: () => void;
  onComplete: (target: Challenge) => void;
}

export function RouletteReel({
  pool,
  spinRequest,
  reducedMotion,
  itemHeight,
  completedIds,
  onTick,
  onSlowdown,
  onComplete,
}: RouletteReelProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const centerElRef = useRef<HTMLElement | null>(null);
  const restIndexRef = useRef(0);
  const busyRef = useRef(false);
  const baseRef = useRef(-CENTER_SLOT);
  const runTokenRef = useRef<number | null>(null);

  const [rows, setRows] = useState<Challenge[]>(() =>
    buildStrip(pool, 0, VISIBLE_ROWS),
  );
  const [run, setRun] = useState<ReelRun | null>(null);

  const poolRef = useRef(pool);
  poolRef.current = pool;
  const pendingResetRef = useRef(false);

  /* ---------------- centre-row highlight ------------------------------- */
  const paintCenter = (stripIndex: number) => {
    const el = stripRef.current;
    if (!el) return;
    const next = el.children[stripIndex] as HTMLElement | undefined;
    const prev = centerElRef.current;
    if (prev && prev !== next) delete prev.dataset.center;
    if (next) next.dataset.center = "true";
    centerElRef.current = next ?? null;
  };

  const resetIdle = (index: number) => {
    const source = poolRef.current;
    const n = source.length;
    if (n === 0) return;
    const safe = modIndex(index, n);
    restIndexRef.current = safe;
    const base = safe - CENTER_SLOT;
    baseRef.current = base;
    const next = buildStrip(source, safe, VISIBLE_ROWS);
    setRows(next);
    if (stripRef.current) {
      stripRef.current.style.transform = `translate3d(0, 0px, 0)`;
    }
    requestAnimationFrame(() => paintCenter(CENTER_SLOT));
  };

  /* ---------------- rebuild the resting window when the pool changes ----- */
  useEffect(() => {
    if (busyRef.current) {
      pendingResetRef.current = true;
      return;
    }
    resetIdle(restIndexRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, itemHeight]);

  /* ---------------- react to a spin request ----------------------------- */
  useEffect(() => {
    if (!spinRequest || pool.length === 0) return;
    if (runTokenRef.current === spinRequest.token) return;

    const targetIndex = pool.findIndex((c) => c.id === spinRequest.target.id);
    // The pool may still be catching up (for example a daily pick forces the
    // "all" filter). Leave the token unset so this effect retries once the pool
    // actually contains the target.
    if (targetIndex < 0) return;
    runTokenRef.current = spinRequest.token;

    const startIndex = modIndex(restIndexRef.current, pool.length);
    const plan = buildSpinPlan({
      poolSize: pool.length,
      startIndex,
      targetIndex,
      reducedMotion,
    });
    const base = startIndex - CENTER_SLOT;
    const rowCount = Math.ceil(plan.totalDistance) + VISIBLE_ROWS + 2;
    busyRef.current = true;
    baseRef.current = base;
    setRows(buildStrip(pool, startIndex, rowCount));
    setRun({ plan, startIndex, base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinRequest?.token, pool, reducedMotion]);

  /* ---------------- run the animation ----------------------------------- */
  useEffect(() => {
    if (!run) return;
    const { plan, startIndex, base } = run;
    const progress = makeProgress(plan.accelFrac, plan.decelFrac);
    const velocity = makeVelocity(plan.accelFrac, plan.decelFrac);
    const startDecel = decelStart(plan.decelFrac);
    const duration = plan.durationMs;
    const t0 = performance.now();

    let raf = 0;
    let lastNearest = startIndex;
    let slowed = false;

    const draw = (pos: number, p: number) => {
      const t = (startIndex - pos) * itemHeight;
      if (stripRef.current) {
        stripRef.current.style.transform = `translate3d(0, ${t}px, 0)`;
      }
      const nearest = Math.round(pos);
      if (nearest !== lastNearest) {
        lastNearest = nearest;
        paintCenter(nearest - base);
        if (!reducedMotion) onTick(velocity(p));
      }
    };

    draw(startIndex, 0);

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const pos = startIndex + plan.totalDistance * progress(p);
      draw(pos, p);

      if (!slowed && p >= startDecel) {
        slowed = true;
        if (!reducedMotion) onSlowdown();
      }

      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        const finalIndex = modIndex(Math.round(startIndex + plan.totalDistance), pool.length);
        restIndexRef.current = finalIndex;
        busyRef.current = false;
        setRun(null);
        onComplete(spinRequest?.target ?? pool[finalIndex]);
        if (pendingResetRef.current) {
          pendingResetRef.current = false;
          // The filter changed mid-spin; rebuild the resting window once the
          // landing frame has had a chance to paint.
          window.setTimeout(() => resetIdle(restIndexRef.current), 80);
        }
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const windowHeight = itemHeight * VISIBLE_ROWS;

  return (
    <div
      className="reel-window"
      style={{ height: windowHeight }}
      role="listbox"
      aria-label="Challenge roulette"
      aria-live="off"
    >
      <div
        className="reel-strip"
        ref={stripRef}
        style={{ willChange: "transform" }}
      >
        {rows.map((challenge, i) => {
          const cat = CATEGORY_MAP[challenge.category];
          const done = completedIds.has(challenge.id);
          return (
            <div
              key={`${challenge.id}-${i}`}
              className="reel-row"
              style={{ height: itemHeight }}
              role="option"
              aria-selected={false}
            >
              <span
                className="reel-row-icon"
                style={{ color: cat.accent }}
                aria-hidden
              >
                <CategoryIcon name={challenge.category} className="size-4" />
              </span>
              <span className="reel-row-name">{challenge.name}</span>
              {done ? (
                <Check className="reel-row-done size-4" aria-hidden />
              ) : (
                <span className="reel-row-cat">{cat.short}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="reel-mask reel-mask-top" aria-hidden />
      <div className="reel-mask reel-mask-bottom" aria-hidden />
      <div className="reel-band" aria-hidden>
        <span className="reel-band-edge reel-band-edge-top" />
        <span className="reel-band-edge reel-band-edge-bottom" />
      </div>
      <div className="reel-glass" aria-hidden />
    </div>
  );
}

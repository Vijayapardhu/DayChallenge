"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  PROJECT_FALLBACK,
  PROJECT_ICONS,
} from "@/components/ProjectIcons";
import {
  buildSpinPlan,
  decelStart,
  makeProgress,
  makeVelocity,
  modIndex,
  type SpinPlan,
} from "@/lib/roulette";
import type { Challenge } from "@/lib/types";

export interface SpinRequest {
  target: Challenge;
  /** Bump this to fire a spin; the value itself is the trigger. */
  token: number;
}

interface CardRun {
  plan: SpinPlan;
  startPos: number;
}

interface RouletteReelProps {
  pool: Challenge[];
  spinRequest: SpinRequest | null;
  reducedMotion: boolean;
  onTick: (velocity: number) => void;
  onSlowdown: () => void;
  onComplete: (target: Challenge) => void;
}

/** Cards shown either side of the one in focus. */
const SIDE = 2;
/** Total cards rendered: the focused one plus the cards either side. */
const SLOT_COUNT = SIDE * 2 + 1;

/** Degrees of tilt per card away from the axis. */
const TILT_PER_STEP = 12;
const MAX_TILT = 26;

/**
 * The reel is a fisheye: the card on the axis is the only one at full size,
 * and every card further out shrinks, dips and turns away until it fades
 * into the background.
 *
 * `d` is the card's signed distance from the axis, in cards.
 */
function fisheye(d: number, card: number, spread: number) {
  const ad = Math.abs(d);
  const sign = d < 0 ? -1 : 1;

  // Cards overlap slightly, like a hand of cards held in a curve.
  const gap = card * 0.8 * spread;
  const curve = card * 0.08 * spread;

  return {
    x: sign * (gap * ad + curve * ad * ad),
    y: card * 0.085 * Math.pow(ad, 1.5),
    z: -card * 0.2 * ad,
    rotateY: -sign * Math.min(MAX_TILT, TILT_PER_STEP * ad),
    scale: 1 / (1 + 0.08 * ad),
    opacity: Math.max(0.1, 1 - 0.22 * ad),
  };
}

/**
 * A single card. The icon and the name are written straight to the DOM while
 * the reel turns, so React never re-renders during a spin.
 */
const ReelCard = memo(function ReelCard({
  setRef,
  iconRef,
  nameRef,
}: {
  setRef: (el: HTMLDivElement | null) => void;
  iconRef: (el: HTMLSpanElement | null) => void;
  nameRef: (el: HTMLSpanElement | null) => void;
}) {
  return (
    <div
      className="reel-card"
      ref={setRef}
      role="option"
      aria-selected={false}
    >
      <span className="reel-card-icon" ref={iconRef} />
      <span className="reel-card-name" ref={nameRef} />
    </div>
  );
});

export function RouletteReel({
  pool,
  spinRequest,
  reducedMotion,
  onTick,
  onSlowdown,
  onComplete,
}: RouletteReelProps) {
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const iconRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const nameRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const reelRef = useRef<HTMLDivElement | null>(null);
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);
  const runTokenRef = useRef<number | null>(null);

  /** Unwrapped pool index held by each card. */
  const slotIdxRef = useRef<number[]>([]);
  /** The pool index currently on the axis. */
  const focusRef = useRef(0);
  /** The challenge each card last showed, so we only rewrite on a change. */
  const slotShownRef = useRef<string[]>([]);

  /** Card size, measured so the reel scales with the viewport. */
  const cardSizeRef = useRef(150);
  /**
   * How far the cards spread, as a fraction of their natural spacing. Narrow
   * screens pull the fan in so it never overflows.
   */
  const spreadRef = useRef(1);
  /** Last written styles, so we only touch the DOM when they change. */
  const lastStyleRef = useRef<
    Array<Record<string, string | number | boolean | undefined>>
  >([]);

  const poolRef = useRef(pool);
  const pendingResetRef = useRef(false);

  const [run, setRun] = useState<CardRun | null>(null);

  /** Stable ref callbacks, so the memoised cards are not re-rendered. */
  const cardSetters = useMemo(
    () =>
      Array.from(
        { length: SLOT_COUNT },
        (_, i) => (el: HTMLDivElement | null) => {
          cardRefs.current[i] = el;
        },
      ),
    [],
  );
  const iconSetters = useMemo(
    () =>
      Array.from(
        { length: SLOT_COUNT },
        (_, i) => (el: HTMLSpanElement | null) => {
          iconRefs.current[i] = el;
        },
      ),
    [],
  );
  const nameSetters = useMemo(
    () =>
      Array.from(
        { length: SLOT_COUNT },
        (_, i) => (el: HTMLSpanElement | null) => {
          nameRefs.current[i] = el;
        },
      ),
    [],
  );

  /* ---------------- measurement ---------------------------------------- */
  useEffect(() => {
    const el = cardRefs.current[0];
    const reel = reelRef.current;
    if (!el || !reel) return;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return;
      cardSizeRef.current = w;

      // Pull the fan in until the outermost card sits inside the reel.
      const avail = reel.getBoundingClientRect().width;
      const reach = w * (0.8 * SIDE + 0.08 * SIDE * SIDE);
      const room = avail - w * 0.5;
      spreadRef.current = room < reach * 2 ? Math.max(0.3, room / (reach * 2)) : 1;
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(reel);
    return () => ro.disconnect();
  }, []);

  /* ---------------- icon sprite ------------------------------------------ */
  /**
   * Each project has its own lucide symbol. The symbols are rendered once
   * into a hidden sprite, then cloned into the cards as the reel turns —
   * that keeps React out of the animation entirely.
   */
  const spriteRefMap = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    const map = new Map<string, string>();
    for (const holder of Array.from(sprite.children)) {
      const id = holder.getAttribute("data-icon");
      const svg = holder.querySelector("svg");
      if (id && svg) map.set(id, svg.outerHTML);
    }
    spriteRefMap.current = map;
    // The cards may already be showing content; refresh them with the sprite.
    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const index = slotIdxRef.current[i];
      if (index === undefined) continue;
      const challenge = poolRef.current[modIndex(index, poolRef.current.length)];
      if (challenge) writeSlot(i, challenge);
    }
  }, []);

  /* ---------------- content -------------------------------------------- */
  const writeSlot = (slot: number, challenge: Challenge) => {
    if (slotShownRef.current[slot] === challenge.id) return;
    slotShownRef.current[slot] = challenge.id;

    const el = cardRefs.current[slot];
    if (el) {
      el.setAttribute("aria-label", challenge.name);
      el.dataset.cat = challenge.category;
    }

    const icon = iconRefs.current[slot];
    if (icon) {
      const markup =
        spriteRefMap.current.get(challenge.id) ??
        spriteRefMap.current.get("__fallback") ??
        "";
      if (icon.dataset.id !== challenge.id) {
        icon.dataset.id = challenge.id;
        icon.innerHTML = markup;
      }
    }
    const label = nameRefs.current[slot];
    if (label && label.textContent !== challenge.name) {
      label.textContent = challenge.name;
    }
  };

  /* ---------------- layout --------------------------------------------- */
  const layout = (pos: number) => {
    const card = cardSizeRef.current;
    const spread = spreadRef.current;

    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const el = cardRefs.current[i];
      if (!el) continue;

      const d = slotIdxRef.current[i] - pos;
      const f = fisheye(d, card, spread);

      const last = lastStyleRef.current[i] ?? {};
      const transform = `translate3d(${f.x.toFixed(2)}px, ${f.y.toFixed(2)}px, ${f.z.toFixed(2)}px) rotateY(${f.rotateY.toFixed(2)}deg) scale(${f.scale.toFixed(4)})`;
      const opacity = f.opacity.toFixed(3);

      if (last.transform !== transform) {
        el.style.transform = transform;
        last.transform = transform;
      }
      if (last.opacity !== opacity) {
        el.style.opacity = opacity;
        last.opacity = opacity;
      }

      // The card on the axis is the one in focus.
      const isCentre = Math.abs(d) < 0.5;
      if (last.centre !== isCentre) {
        el.classList.toggle("is-centre", isCentre);
        last.centre = isCentre;
      }

      // Cards nearer the axis sit in front of the ones further out.
      const zIndex = String(50 - Math.round(Math.abs(d) * 10));
      if (last.zIndex !== zIndex) {
        el.style.zIndex = zIndex;
        last.zIndex = zIndex;
      }

      lastStyleRef.current[i] = last;
    }
  };

  /* ---------------- keeping the fan symmetric -------------------------- */
  /**
   * The cards always hold the run of indices centred on the focus, so the
   * fan stays balanced. When the focus moves, the card that falls off one end
   * is handed the new index coming in from the other.
   */
  const recentre = (from: number, to: number) => {
    if (to === from) return;
    const step = to > from ? 1 : -1;
    const gap = Math.abs(to - from);

    for (let k = 0; k < gap; k += 1) {
      const focus = from + step * (k + 1);
      // The index leaving the window on the trailing side.
      const leaving = step > 0 ? focus - SIDE - 1 : focus + SIDE + 1;
      // The index joining the window on the leading side.
      const entering = step > 0 ? focus + SIDE : focus - SIDE;

      const slot = slotIdxRef.current.indexOf(leaving);
      if (slot < 0) continue;
      slotIdxRef.current[slot] = entering;
      const source = poolRef.current;
      if (source.length === 0) continue;
      writeSlot(slot, source[modIndex(entering, source.length)]);
    }
  };

  /* ---------------- reset ---------------------------------------------- */
  const resetIdle = (centrePos: number) => {
    const source = poolRef.current;
    if (source.length === 0) return;

    focusRef.current = Math.round(centrePos);
    const low = focusRef.current - SIDE;

    for (let i = 0; i < SLOT_COUNT; i += 1) {
      slotIdxRef.current[i] = low + i;
      writeSlot(i, source[modIndex(low + i, source.length)]);
    }

    lastStyleRef.current = [];
    layout(centrePos);
  };

  /* ---------------- rebuild when the pool changes ------------------------ */
  useEffect(() => {
    if (busyRef.current) {
      pendingResetRef.current = true;
      return;
    }
    resetIdle(focusRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

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

    const n = pool.length;
    const startPos = focusRef.current;
    const startIndex = modIndex(startPos, n);
    const plan = buildSpinPlan({
      poolSize: n,
      startIndex,
      targetIndex,
      reducedMotion,
    });

    busyRef.current = true;
    setRun({ plan, startPos });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinRequest?.token, pool, reducedMotion]);

  /* ---------------- run the animation ----------------------------------- */
  useEffect(() => {
    if (!run) return;
    const { plan, startPos } = run;
    const progress = makeProgress(plan.accelFrac, plan.decelFrac);
    const velocity = makeVelocity(plan.accelFrac, plan.decelFrac);
    const startDecel = decelStart(plan.decelFrac);
    const duration = plan.durationMs;
    const t0 = performance.now();

    let raf = 0;
    let lastFocus = Math.round(startPos);
    let slowed = false;

    const draw = (pos: number, p: number) => {
      const focus = Math.round(pos);
      if (focus !== lastFocus) {
        recentre(lastFocus, focus);
        lastFocus = focus;
        focusRef.current = focus;
        if (!reducedMotion) onTick(velocity(p));
      }
      layout(pos);
    };

    draw(startPos, 0);

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const pos = startPos + plan.totalDistance * progress(p);
      draw(pos, p);

      if (!slowed && p >= startDecel) {
        slowed = true;
        if (!reducedMotion) onSlowdown();
      }

      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        const n = pool.length;
        const finalIndex = modIndex(Math.round(startPos + plan.totalDistance), n);
        busyRef.current = false;
        setRun(null);
        onComplete(spinRequest?.target ?? pool[finalIndex]);
        if (pendingResetRef.current) {
          pendingResetRef.current = false;
          window.setTimeout(() => resetIdle(focusRef.current), 80);
        }
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return (
    <>
      <div
        className="reel"
        ref={reelRef}
        role="listbox"
        aria-label="Challenge roulette"
        aria-live="off"
      >
        {Array.from({ length: SLOT_COUNT }).map((_, i) => (
          <ReelCard
            key={i}
            setRef={cardSetters[i]}
            iconRef={iconSetters[i]}
            nameRef={nameSetters[i]}
          />
        ))}
        <span className="reel-pointer" aria-hidden />
      </div>

      {/* Every project's symbol, rendered once and cloned into the cards. */}
      <div className="reel-sprite" ref={spriteRef} aria-hidden>
        {Object.entries(PROJECT_ICONS).map(([id, Icon]) => (
          <span key={id} data-icon={id}>
            <Icon strokeWidth={1.5} aria-hidden />
          </span>
        ))}
        <span data-icon="__fallback">
          <PROJECT_FALLBACK strokeWidth={1.5} aria-hidden />
        </span>
      </div>
    </>
  );
}

/**
 * Roulette motion maths.
 *
 * The reel uses a trapezoidal velocity profile: linear acceleration, a cruise
 * hold, then a long linear deceleration to a dead stop. Integrating that
 * profile gives the normalised displacement used to drive the reel, which is
 * what makes the spin feel mechanical rather than springy.
 */

/** Number of rows visible in the reel window (odd, so one sits dead centre). */
export const VISIBLE_ROWS = 9;
/** Strip index that lines up with the centre of the window. */
export const CENTER_SLOT = Math.floor(VISIBLE_ROWS / 2);

export interface SpinPlan {
  /** Distance to travel, measured in rows. */
  totalDistance: number;
  /** Animation length in ms. */
  durationMs: number;
  /** Fraction of the timeline spent accelerating (0–1). */
  accelFrac: number;
  /** Fraction of the timeline spent decelerating (0–1). */
  decelFrac: number;
}

export interface SpinPlanInput {
  poolSize: number;
  /** Pool index currently sitting in the centre. */
  startIndex: number;
  /** Pool index we want to land on. */
  targetIndex: number;
  reducedMotion?: boolean;
}

export function buildSpinPlan({
  poolSize,
  startIndex,
  targetIndex,
  reducedMotion = false,
}: SpinPlanInput): SpinPlan {
  const n = Math.max(1, poolSize);
  // Forward-only distance from the current row to the target row.
  const delta = (((targetIndex - startIndex) % n) + n) % n;

  // Aim for a similar total travel regardless of how big the pool is, so the
  // spin lasts the same whether you filtered down to 5 or have all 115.
  const targetTravel = 150 + Math.random() * 90;
  const rotations = clampInt(Math.round(targetTravel / n), 1, 60);
  const totalDistance = rotations * n + delta;

  if (reducedMotion) {
    return {
      totalDistance: n + delta,
      durationMs: 900,
      accelFrac: 0.3,
      decelFrac: 0.55,
    };
  }

  return {
    totalDistance,
    durationMs: 4600 + Math.random() * 1500,
    accelFrac: 0.16,
    decelFrac: 0.52,
  };
}

/** Normalised displacement for a trapezoidal velocity profile. */
export function makeProgress(
  accelFrac: number,
  decelFrac: number,
): (p: number) => number {
  const pa = Math.max(0, accelFrac);
  const pd = Math.max(0, decelFrac);
  const cruise = Math.max(0, 1 - pa - pd);
  const totalArea = 0.5 * pa + cruise + 0.5 * pd || 1;

  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let area: number;
    if (p <= pa) {
      area = (0.5 * p * p) / pa;
    } else if (p <= 1 - pd) {
      area = 0.5 * pa + (p - pa);
    } else {
      const q = p - (1 - pd);
      area = 0.5 * pa + cruise + (q - (0.5 * q * q) / pd);
    }
    return area / totalArea;
  };
}

/** Normalised velocity (0–1) at timeline position p — drives tick timbre. */
export function makeVelocity(
  accelFrac: number,
  decelFrac: number,
): (p: number) => number {
  const pa = Math.max(0.0001, accelFrac);
  const pd = Math.max(0.0001, decelFrac);
  return (p: number) => {
    if (p <= 0 || p >= 1) return 0;
    if (p <= pa) return p / pa;
    if (p <= 1 - pd) return 1;
    const q = p - (1 - pd);
    return Math.max(0, 1 - q / pd);
  };
}

/** Timeline position where deceleration begins. */
export function decelStart(decelFrac: number): number {
  return 1 - Math.max(0, decelFrac);
}

export function modIndex(index: number, size: number): number {
  if (size <= 0) return 0;
  return ((index % size) + size) % size;
}

/** Build the rendered strip so that `startIndex` sits in the centre row. */
export function buildStrip<T>(
  pool: readonly T[],
  startIndex: number,
  rowCount: number,
): T[] {
  const n = pool.length;
  if (n === 0) return [];
  const base = startIndex - CENTER_SLOT;
  const out: T[] = [];
  for (let j = 0; j < rowCount; j += 1) {
    out.push(pool[modIndex(base + j, n)]);
  }
  return out;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

import { CHALLENGES } from "@/data/challenges";
import type { Challenge } from "@/lib/types";
import { hashString, todayKey } from "@/lib/utils";

/**
 * Deterministic daily pick. The same calendar day always resolves to the same
 * challenge, and because the seed only depends on the date string, every user
 * running the same curated list sees the same "challenge of the day".
 *
 * Custom (user-authored) challenges are deliberately excluded so that adding
 * one mid-day does not shuffle the current daily result.
 */
export function getDailyChallenge(
  dateKey: string = todayKey(),
  pool: readonly Challenge[] = CHALLENGES,
): Challenge {
  const safePool = pool.length > 0 ? pool : CHALLENGES;
  const index = hashString(`civi-daily::${dateKey}`) % safePool.length;
  return safePool[index];
}

/** Next N days, handy for "coming up" previews. */
export function getUpcomingDailies(
  count = 3,
  pool: readonly Challenge[] = CHALLENGES,
  from = new Date(),
): Array<{ dateKey: string; challenge: Challenge }> {
  const out: Array<{ dateKey: string; challenge: Challenge }> = [];
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = todayKey(d);
    out.push({ dateKey: key, challenge: getDailyChallenge(key, pool) });
  }
  return out;
}

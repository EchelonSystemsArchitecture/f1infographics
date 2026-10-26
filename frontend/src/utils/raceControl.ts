import type { RaceControlEvent } from '../api/client'

/**
 * Latest race-control event that has actually happened at clock time `t`.
 * Returns null before the first event instead of falling back to the last row
 * in the dataset (which would expose future messages).
 */
export function latestRaceControlEvent(
  events: readonly RaceControlEvent[],
  startMs: number,
  t: number,
): RaceControlEvent | null {
  if (!Number.isFinite(startMs) || !Number.isFinite(t)) return null
  const nowMs = startMs + Math.max(0, t) * 1000
  let best: RaceControlEvent | null = null
  let bestMs = Number.NEGATIVE_INFINITY
  for (const event of events) {
    const eventMs = Date.parse(event.date)
    if (!Number.isFinite(eventMs) || eventMs > nowMs) continue
    if (eventMs >= bestMs) {
      best = event
      bestMs = eventMs
    }
  }
  return best
}

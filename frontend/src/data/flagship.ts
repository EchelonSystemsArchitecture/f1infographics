import type { SessionInfo } from '../api/client'

export const FLAGSHIP_SESSION_KEY = 9558

/**
 * Derive race-clock duration from the session window (date_end − date_start),
 * clamped to [30m, 4h] so a real Sprint window is not stretched to an hour and
 * a bad window can never blank the scrubber. Fallback: 87 minutes.
 */
export function sessionDurationSeconds(session: SessionInfo | undefined): number {
  const MIN_WINDOW = 30 * 60
  const MAX_WINDOW = 4 * 3600
  if (!session?.date_start || !session?.date_end) return 87 * 60
  const start = Date.parse(session.date_start)
  const end = Date.parse(session.date_end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 87 * 60
  }
  const seconds = Math.round((end - start) / 1000)
  return Math.min(Math.max(seconds, MIN_WINDOW), MAX_WINDOW)
}

/**
 * Stable driver-number → team colour for the real 2024 British GP grid.
 * Data-layer fallback only: the API's `team_colour` is the primary source
 * (see `useDriverColour`), which normalizes the API's `#`-less hex.
 * Never colour-only: every row also shows the 3-letter acronym.
 */
export const DRIVER_COLOUR: Record<number, string> = {
  1: '#3671c6', // VER — Red Bull
  11: '#3671c6', // PER — Red Bull
  16: '#e8002d', // LEC — Ferrari
  55: '#e8002d', // SAI — Ferrari
  4: '#ff8000', // NOR — McLaren
  81: '#ff8000', // PIA — McLaren
  44: '#27f4d2', // HAM — Mercedes
  63: '#27f4d2', // RUS — Mercedes
  14: '#229971', // ALO — Aston Martin
  18: '#229971', // STR — Aston Martin
  10: '#0093cc', // GAS — Alpine
  31: '#0093cc', // OCO — Alpine
  3: '#6692ff', // RIC — RB (VCARB)
  22: '#6692ff', // TSU — RB (VCARB)
  27: '#b6babd', // HUL — Haas
  20: '#b6babd', // MAG — Haas
  77: '#52e252', // BOT — Kick Sauber
  24: '#52e252', // ZHO — Kick Sauber
  23: '#64c4ff', // ALB — Williams
  2: '#64c4ff', // SAR — Williams
}

/** Format race-clock seconds as mm:ss.mmm or h:mm:ss.mmm. */
export function formatClock(t: number): string {
  if (!Number.isFinite(t)) return '—'
  const clamped = Math.max(0, t)
  const totalMs = Math.round(clamped * 1000)
  const ms = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const s = totalSec % 60
  const m = Math.floor(totalSec / 60) % 60
  const h = Math.floor(totalSec / 3600)
  const ss = String(s).padStart(2, '0')
  const mmm = String(ms).padStart(3, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}.${mmm}`
  return `${String(m).padStart(2, '0')}:${ss}.${mmm}`
}

/** Format a gap/interval value for the timing tower (seconds, 3 dp, or leader/—). */
export function formatGap(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  return `${seconds.toFixed(3)}`
}

/** Last-lap time from milliseconds → m:ss.mmm. */
export function formatLapMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  const totalMs = Math.round(ms)
  const rem = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const s = totalSec % 60
  const m = Math.floor(totalSec / 60)
  return `${m}:${String(s).padStart(2, '0')}.${String(rem).padStart(3, '0')}`
}

/** Short tyre compound label. */
export function formatCompound(c: string | null | undefined): string {
  const trimmed = c?.trim()
  if (!trimmed) return '—'
  const map: Record<string, string> = {
    SOFT: 'S',
    MEDIUM: 'M',
    HARD: 'H',
    INTERMEDIATE: 'I',
    WET: 'W',
  }
  return map[trimmed.toUpperCase()] ?? trimmed.slice(0, 3).toUpperCase()
}

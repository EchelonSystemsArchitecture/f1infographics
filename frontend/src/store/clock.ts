import { create } from 'zustand'

export interface ClockState {
  t: number
  playing: boolean
  speed: number
  duration: number
  set: (t: number) => void
  toggle: () => void
  setSpeed: (speed: number) => void
  seek: (t: number) => void
  setDuration: (duration: number) => void
  reset: () => void
}

function clampTime(value: number, duration: number): number | null {
  if (Number.isNaN(value)) return null
  if (value === Number.POSITIVE_INFINITY) return duration
  if (value === Number.NEGATIVE_INFINITY) return 0
  return Math.max(0, Math.min(value, duration))
}

export const useClock = create<ClockState>((set, get) => ({
  t: 0,
  playing: false,
  speed: 1,
  duration: 0,
  set: (t) => {
    const next = clampTime(t, get().duration)
    if (next !== null) set({ t: next })
  },
  toggle: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => {
    if (Number.isFinite(speed) && speed > 0) set({ speed })
  },
  seek: (t) => {
    const next = clampTime(t, get().duration)
    if (next !== null) set({ t: next })
  },
  setDuration: (duration) => {
    if (Number.isNaN(duration)) return
    const nextDuration = Math.max(0, duration)
    const current = get().t
    set({ duration: nextDuration, t: Number.isFinite(current) ? Math.min(current, nextDuration) : 0 })
  },
  reset: () => set({ t: 0, playing: false }),
}))

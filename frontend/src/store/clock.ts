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
}

export const useClock = create<ClockState>((set, get) => ({
  t: 0,
  playing: false,
  speed: 1,
  duration: 0,
  set: (t) => set({ t: Math.max(0, Math.min(t, get().duration)) }),
  toggle: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
  seek: (t) => set({ t: Math.max(0, Math.min(t, get().duration)) }),
  setDuration: (duration) => set({ duration: Math.max(0, duration) }),
}))

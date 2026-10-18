import { describe, expect, it } from 'vitest'
import { useClock } from '../store/clock'

describe('race clock store', () => {
  it('clamps seek to [0, duration]', () => {
    useClock.setState({ t: 0, duration: 100 })
    useClock.getState().seek(-10)
    expect(useClock.getState().t).toBe(0)
    useClock.getState().seek(250)
    expect(useClock.getState().t).toBe(100)
  })

  it('toggles play state', () => {
    useClock.setState({ playing: false })
    useClock.getState().toggle()
    expect(useClock.getState().playing).toBe(true)
    useClock.getState().toggle()
    expect(useClock.getState().playing).toBe(false)
  })

  it('sets playback speed', () => {
    useClock.getState().setSpeed(4)
    expect(useClock.getState().speed).toBe(4)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useClock } from './clock'

function reset() {
  useClock.setState({ t: 0, playing: false, speed: 1, duration: 0 })
}

describe('clock store edge cases', () => {
  beforeEach(reset)

  it('starts paused at zero', () => {
    expect(useClock.getState()).toMatchObject({ t: 0, playing: false, speed: 1, duration: 0 })
  })

  it('set clamps below zero', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().set(-0.001)
    expect(useClock.getState().t).toBe(0)
  })

  it('set clamps above duration', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().set(100.001)
    expect(useClock.getState().t).toBe(100)
  })

  it('set keeps exact boundaries', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().set(0)
    expect(useClock.getState().t).toBe(0)
    useClock.getState().set(100)
    expect(useClock.getState().t).toBe(100)
  })

  it('set accepts Infinity by clamping to duration', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().set(Number.POSITIVE_INFINITY)
    expect(useClock.getState().t).toBe(100)
  })

  it('set accepts -Infinity by clamping to zero', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().set(Number.NEGATIVE_INFINITY)
    expect(useClock.getState().t).toBe(0)
  })

  it.fails('set should ignore NaN instead of poisoning the clock', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().set(Number.NaN)
    expect(useClock.getState().t).toBe(0)
  })

  it('set with NaN currently poisons the clock', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().set(Number.NaN)
    expect(useClock.getState().t).toBeNaN()
  })

  it('seek clamps below zero', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().seek(-1)
    expect(useClock.getState().t).toBe(0)
  })

  it('seek clamps above duration', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().seek(101)
    expect(useClock.getState().t).toBe(100)
  })

  it.fails('seek should ignore NaN instead of poisoning the clock', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().seek(Number.NaN)
    expect(useClock.getState().t).toBe(0)
  })

  it('setDuration clamps negative values to zero', () => {
    useClock.getState().setDuration(-10)
    expect(useClock.getState().duration).toBe(0)
  })

  it('setDuration accepts zero', () => {
    useClock.getState().setDuration(0)
    expect(useClock.getState().duration).toBe(0)
  })

  it('setDuration accepts a normal race window', () => {
    useClock.getState().setDuration(5400)
    expect(useClock.getState().duration).toBe(5400)
  })

  it('setDuration accepts Infinity', () => {
    useClock.getState().setDuration(Number.POSITIVE_INFINITY)
    expect(useClock.getState().duration).toBe(Number.POSITIVE_INFINITY)
  })

  it.fails('setDuration should reject NaN', () => {
    useClock.getState().setDuration(Number.NaN)
    expect(useClock.getState().duration).toBe(0)
  })

  it('setDuration with NaN currently poisons duration', () => {
    useClock.getState().setDuration(Number.NaN)
    expect(useClock.getState().duration).toBeNaN()
  })

  it.fails('shrinking duration should clamp the current time', () => {
    useClock.setState({ duration: 5400, t: 5000 })
    useClock.getState().setDuration(1800)
    expect(useClock.getState().t).toBe(1800)
  })

  it('shrinking duration currently leaves time beyond the scrubber', () => {
    useClock.setState({ duration: 5400, t: 5000 })
    useClock.getState().setDuration(1800)
    expect(useClock.getState().t).toBe(5000)
  })

  it('setDuration does not reset playback state', () => {
    useClock.setState({ playing: true })
    useClock.getState().setDuration(1800)
    expect(useClock.getState().playing).toBe(true)
  })

  it('toggle flips play and pause', () => {
    useClock.getState().toggle()
    expect(useClock.getState().playing).toBe(true)
    useClock.getState().toggle()
    expect(useClock.getState().playing).toBe(false)
  })

  it('toggle is idempotent in pairs', () => {
    const before = useClock.getState().playing
    useClock.getState().toggle()
    useClock.getState().toggle()
    expect(useClock.getState().playing).toBe(before)
  })

  it('setSpeed accepts each UI speed', () => {
    for (const speed of [0.5, 1, 2, 4, 8]) {
      useClock.getState().setSpeed(speed)
      expect(useClock.getState().speed).toBe(speed)
    }
  })

  it.fails('setSpeed should reject zero', () => {
    useClock.getState().setSpeed(0)
    expect(useClock.getState().speed).toBe(1)
  })

  it.fails('setSpeed should reject negative speed', () => {
    useClock.getState().setSpeed(-1)
    expect(useClock.getState().speed).toBe(1)
  })

  it.fails('setSpeed should reject NaN', () => {
    useClock.getState().setSpeed(Number.NaN)
    expect(useClock.getState().speed).toBe(1)
  })

  it('setSpeed currently accepts zero, negative and NaN', () => {
    useClock.getState().setSpeed(0)
    expect(useClock.getState().speed).toBe(0)
    useClock.getState().setSpeed(-1)
    expect(useClock.getState().speed).toBe(-1)
    useClock.getState().setSpeed(Number.NaN)
    expect(useClock.getState().speed).toBeNaN()
  })

  it('set with zero duration clamps every value to zero', () => {
    useClock.setState({ duration: 0 })
    useClock.getState().set(50)
    expect(useClock.getState().t).toBe(0)
  })

  it('set notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = useClock.subscribe(listener)
    useClock.getState().seek(10)
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })

  it('setDuration notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = useClock.subscribe(listener)
    useClock.getState().setDuration(120)
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })

  it('state updates are synchronous', () => {
    useClock.setState({ duration: 100 })
    useClock.getState().seek(42)
    expect(useClock.getState().t).toBe(42)
  })

  it.fails('switching session duration should also reset t to zero', () => {
    useClock.setState({ duration: 5400, t: 3000 })
    useClock.getState().setDuration(3600)
    expect(useClock.getState().t).toBe(0)
  })
})

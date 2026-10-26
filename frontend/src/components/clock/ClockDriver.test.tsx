// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClockDriver } from './ClockDriver'
import { useClock } from '../../store/clock'

let queue = new Map<number, FrameRequestCallback>()
let nextId = 1
let now = 0

function frame(ms: number) {
  now += ms
  const pending = [...queue.values()]
  queue.clear()
  act(() => pending.forEach((callback) => callback(now)))
}

beforeEach(() => {
  queue = new Map()
  nextId = 1
  now = 0
  useClock.setState({ t: 0, playing: false, speed: 1, duration: 0 })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++
    queue.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    queue.delete(id)
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ClockDriver', () => {
  it('advances the shared clock while playing', () => {
    useClock.setState({ duration: 100, playing: true })
    render(<ClockDriver />)

    frame(1_000)
    expect(useClock.getState().t).toBe(0)

    frame(1_000)
    expect(useClock.getState().t).toBe(1)
  })

  it('does not schedule frames while paused', () => {
    useClock.setState({ duration: 100, t: 10, playing: false })
    render(<ClockDriver />)

    expect(queue.size).toBe(0)
    frame(5_000)
    expect(useClock.getState().t).toBe(10)
  })

  it('stops at the session duration and pauses playback', () => {
    useClock.setState({ duration: 10, t: 9.5, playing: true })
    render(<ClockDriver />)

    frame(1_000)
    frame(1_000)

    expect(useClock.getState().t).toBe(10)
    expect(useClock.getState().playing).toBe(false)
  })

  it('applies the selected playback speed', () => {
    useClock.setState({ duration: 100, speed: 4, playing: true })
    render(<ClockDriver />)

    frame(1_000)
    frame(1_000)

    expect(useClock.getState().t).toBe(4)
  })

  it('restarts cleanly when playback resumes', () => {
    useClock.setState({ duration: 100, t: 1, playing: true })
    const { rerender } = render(<ClockDriver />)
    frame(1_000)
    frame(1_000)
    expect(useClock.getState().t).toBe(2)

    act(() => useClock.setState({ playing: false }))
    frame(3_000)
    act(() => useClock.setState({ playing: true }))
    rerender(<ClockDriver />)
    frame(1_000)
    expect(useClock.getState().t).toBe(2)

    frame(1_000)
    expect(useClock.getState().t).toBe(3)
  })
})

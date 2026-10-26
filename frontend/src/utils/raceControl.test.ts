import { describe, expect, it } from 'vitest'
import type { RaceControlEvent } from '../api/client'
import { latestRaceControlEvent } from './raceControl'

const START = Date.parse('2024-07-07T14:00:00+00:00')

function event(date: string, message: string): RaceControlEvent {
  return {
    date,
    lap_number: 1,
    message,
    flag: null,
    category: null,
    driver_number: null,
    data_mode: 'REPLAY',
  }
}

const EVENTS = [
  event('2024-07-07T14:01:00+00:00', 'GREEN LIGHT'),
  event('2024-07-07T14:02:00+00:00', 'SAFETY CAR DEPLOYED'),
  event('2024-07-07T14:03:00+00:00', 'SAFETY CAR IN THIS LAP'),
]

describe('latestRaceControlEvent', () => {
  it('returns null before the first event', () => {
    expect(latestRaceControlEvent(EVENTS, START, 0)).toBeNull()
  })

  it('returns an event exactly at its timestamp', () => {
    expect(latestRaceControlEvent(EVENTS, START, 60)?.message).toBe('GREEN LIGHT')
  })

  it('returns the latest event that has already happened', () => {
    expect(latestRaceControlEvent(EVENTS, START, 125)?.message).toBe(
      'SAFETY CAR DEPLOYED',
    )
  })

  it('never returns an event in the future', () => {
    const latest = latestRaceControlEvent(EVENTS, START, 30)
    expect(latest).toBeNull()
    expect(latestRaceControlEvent(EVENTS, START, 59.999)).toBeNull()
  })

  it('returns the final event after the session', () => {
    expect(latestRaceControlEvent(EVENTS, START, 10_000)?.message).toBe(
      'SAFETY CAR IN THIS LAP',
    )
  })

  it('ignores invalid dates and timestamps', () => {
    expect(latestRaceControlEvent([event('not-a-date', 'BROKEN')], START, 100)).toBeNull()
    expect(latestRaceControlEvent(EVENTS, Number.NaN, 100)).toBeNull()
    expect(latestRaceControlEvent(EVENTS, START, Number.NaN)).toBeNull()
  })

  it('is independent of source ordering', () => {
    const reversed = [...EVENTS].reverse()
    expect(latestRaceControlEvent(reversed, START, 125)?.message).toBe(
      'SAFETY CAR DEPLOYED',
    )
  })
})

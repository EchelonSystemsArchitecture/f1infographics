import { describe, expect, it } from 'vitest'
import type { SessionInfo } from '../api/client'
import {
  DRIVER_COLOUR,
  FLAGSHIP_SESSION_KEY,
  sessionDurationSeconds,
} from './flagship'

function session(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    session_key: 9558,
    meeting_key: 1240,
    session_name: 'Race',
    session_type: 'Race',
    circuit_short_name: 'Silverstone',
    country_name: 'United Kingdom',
    year: 2024,
    date_start: '2024-07-07T14:00:00+00:00',
    date_end: '2024-07-07T16:00:00+00:00',
    gmt_offset: '01:00:00',
    data_mode: 'REPLAY',
    ...overrides,
  }
}

describe('sessionDurationSeconds', () => {
  it('uses the flagship session key', () => {
    expect(FLAGSHIP_SESSION_KEY).toBe(9558)
  })

  it('derives a two-hour window', () => {
    expect(sessionDurationSeconds(session())).toBe(7200)
  })

  it('falls back to 87 minutes without a session', () => {
    expect(sessionDurationSeconds(undefined)).toBe(87 * 60)
  })

  it('falls back when date_start is missing', () => {
    expect(sessionDurationSeconds(session({ date_start: '' }))).toBe(87 * 60)
  })

  it('falls back when date_end is missing', () => {
    expect(sessionDurationSeconds(session({ date_end: '' }))).toBe(87 * 60)
  })

  it('falls back on invalid dates', () => {
    expect(sessionDurationSeconds(session({ date_start: 'not-a-date' }))).toBe(87 * 60)
  })

  it('falls back when end equals start', () => {
    expect(
      sessionDurationSeconds(
        session({ date_start: '2024-07-07T14:00:00+00:00', date_end: '2024-07-07T14:00:00+00:00' }),
      ),
    ).toBe(87 * 60)
  })

  it('falls back when end precedes start', () => {
    expect(
      sessionDurationSeconds(
        session({ date_start: '2024-07-07T16:00:00+00:00', date_end: '2024-07-07T14:00:00+00:00' }),
      ),
    ).toBe(87 * 60)
  })

  it('clamps a short window up to thirty minutes', () => {
    expect(
      sessionDurationSeconds(
        session({ date_start: '2024-07-07T14:00:00+00:00', date_end: '2024-07-07T14:10:00+00:00' }),
      ),
    ).toBe(1800)
  })

  it('keeps a one-hour window exactly', () => {
    expect(
      sessionDurationSeconds(
        session({ date_start: '2024-07-07T14:00:00+00:00', date_end: '2024-07-07T15:00:00+00:00' }),
      ),
    ).toBe(3600)
  })

  it('clamps a five-hour window down to four hours', () => {
    expect(
      sessionDurationSeconds(
        session({ date_start: '2024-07-07T14:00:00+00:00', date_end: '2024-07-07T19:00:00+00:00' }),
      ),
    ).toBe(4 * 3600)
  })

  it('keeps a four-hour window exactly', () => {
    expect(
      sessionDurationSeconds(
        session({ date_start: '2024-07-07T14:00:00+00:00', date_end: '2024-07-07T18:00:00+00:00' }),
      ),
    ).toBe(4 * 3600)
  })

  it('handles timezone offsets', () => {
    expect(
      sessionDurationSeconds(
        session({ date_start: '2024-07-07T14:00:00+02:00', date_end: '2024-07-07T16:00:00+02:00' }),
      ),
    ).toBe(7200)
  })

  it('a real 30-minute sprint window should not be clamped to one hour', () => {
    expect(
      sessionDurationSeconds(
        session({
          session_name: 'Sprint',
          date_start: '2023-04-29T13:30:00+00:00',
          date_end: '2023-04-29T14:00:00+00:00',
        }),
      ),
    ).toBe(1800)
  })

  it('rounds fractional seconds', () => {
    expect(
      sessionDurationSeconds(
        session({
          date_start: '2024-07-07T14:00:00.000+00:00',
          date_end: '2024-07-07T16:00:00.500+00:00',
        }),
      ),
    ).toBe(7201)
  })
})

describe('DRIVER_COLOUR', () => {
  it('contains the 20-driver 2024 British grid', () => {
    expect(Object.keys(DRIVER_COLOUR)).toHaveLength(20)
    expect(new Set(Object.values(DRIVER_COLOUR)).size).toBe(10)
  })

  it('uses valid six-digit hex values', () => {
    for (const colour of Object.values(DRIVER_COLOUR)) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('maps team mates to the same colour', () => {
    expect(DRIVER_COLOUR[1]).toBe(DRIVER_COLOUR[11])
    expect(DRIVER_COLOUR[44]).toBe(DRIVER_COLOUR[63])
    expect(DRIVER_COLOUR[4]).toBe(DRIVER_COLOUR[81])
  })

  it('contains no positional placeholder numbers', () => {
    expect(DRIVER_COLOUR[99]).toBeUndefined()
    expect(DRIVER_COLOUR[0]).toBeUndefined()
  })

  it('distinguishes every team', () => {
    const teams = [
      [1, 11],
      [16, 55],
      [4, 81],
      [44, 63],
      [14, 18],
      [10, 31],
      [3, 22],
      [27, 20],
      [77, 24],
      [23, 2],
    ]
    const colours = teams.map(([a]) => DRIVER_COLOUR[a])
    expect(new Set(colours).size).toBe(10)
  })
})

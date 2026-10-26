import { describe, expect, it } from 'vitest'
import { formatClock, formatCompound, formatGap, formatLapMs } from './format'

describe('formatClock', () => {
  it('formats zero', () => {
    expect(formatClock(0)).toBe('00:00.000')
  })

  it('formats sub-second values', () => {
    expect(formatClock(0.001)).toBe('00:00.001')
    expect(formatClock(0.999)).toBe('00:00.999')
  })

  it('pads minutes and seconds', () => {
    expect(formatClock(61.5)).toBe('01:01.500')
  })

  it('rolls 59.9996 into the next minute', () => {
    expect(formatClock(59.9996)).toBe('01:00.000')
  })

  it('uses h:mm:ss above one hour', () => {
    expect(formatClock(3600)).toBe('1:00:00.000')
    expect(formatClock(3723.456)).toBe('1:02:03.456')
  })

  it('clamps negative time to zero', () => {
    expect(formatClock(-0.001)).toBe('00:00.000')
    expect(formatClock(-100)).toBe('00:00.000')
  })

  it('keeps 59:59.999 below the hour boundary', () => {
    expect(formatClock(3599.999)).toBe('59:59.999')
  })

  it('formats a full race duration', () => {
    expect(formatClock(5400)).toBe('1:30:00.000')
  })

  it('should not expose Infinity as a clock value', () => {
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('should not expose NaN as a clock value', () => {
    expect(formatClock(Number.NaN)).toBe('—')
  })
})

describe('formatGap', () => {
  it('renders null and undefined as an em dash', () => {
    expect(formatGap(null)).toBe('—')
    expect(formatGap(undefined)).toBe('—')
  })

  it('renders NaN as an em dash', () => {
    expect(formatGap(Number.NaN)).toBe('—')
  })

  it('renders three decimals', () => {
    expect(formatGap(0)).toBe('0.000')
    expect(formatGap(1.23456)).toBe('1.235')
  })

  it('keeps signed gaps', () => {
    expect(formatGap(-1.5)).toBe('-1.500')
  })

  it('should treat Infinity as unavailable', () => {
    expect(formatGap(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('formatLapMs', () => {
  it('formats a normal lap', () => {
    expect(formatLapMs(89500)).toBe('1:29.500')
  })

  it('formats zero', () => {
    expect(formatLapMs(0)).toBe('0:00.000')
  })

  it('renders null and undefined as an em dash', () => {
    expect(formatLapMs(null)).toBe('—')
    expect(formatLapMs(undefined)).toBe('—')
  })

  it('renders NaN as an em dash', () => {
    expect(formatLapMs(Number.NaN)).toBe('—')
  })

  it('rounds milliseconds', () => {
    expect(formatLapMs(89499.6)).toBe('1:29.500')
  })

  it('formats a two-minute lap', () => {
    expect(formatLapMs(123456)).toBe('2:03.456')
  })

  it('should reject negative lap times', () => {
    expect(formatLapMs(-1)).toBe('—')
  })

  it('should reject infinite lap times', () => {
    expect(formatLapMs(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('formatCompound', () => {
  it('shortens the five dry/wet compounds', () => {
    expect(formatCompound('SOFT')).toBe('S')
    expect(formatCompound('MEDIUM')).toBe('M')
    expect(formatCompound('HARD')).toBe('H')
    expect(formatCompound('INTERMEDIATE')).toBe('I')
    expect(formatCompound('WET')).toBe('W')
  })

  it('is case insensitive', () => {
    expect(formatCompound('soft')).toBe('S')
  })

  it('renders empty and null as an em dash', () => {
    expect(formatCompound('')).toBe('—')
    expect(formatCompound(null)).toBe('—')
    expect(formatCompound(undefined)).toBe('—')
  })

  it('falls back to the first three characters', () => {
    expect(formatCompound('SUPERSOFT')).toBe('SUP')
  })

  it('should trim whitespace before matching', () => {
    expect(formatCompound(' soft ')).toBe('S')
  })
})

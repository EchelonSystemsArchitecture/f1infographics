import { describe, expect, it } from 'vitest'
import { cumulativeDelta, deltaTimeAt } from './delta'

describe('deltaTimeAt edge cases', () => {
  it('returns zero only for equal valid speeds', () => {
    expect(deltaTimeAt(200, 200, 120)).toBe(0)
    expect(deltaTimeAt(5, 5, 120)).toBe(0)
  })

  it('uses km/h to m/s conversion', () => {
    expect(deltaTimeAt(180, 200, 1000)).toBeCloseTo(2, 10)
  })

  it('scales linearly with distance', () => {
    expect(deltaTimeAt(180, 200, 2000)).toBeCloseTo(4, 10)
  })

  it('is antisymmetric', () => {
    expect(deltaTimeAt(180, 200, 500)).toBeCloseTo(-deltaTimeAt(200, 180, 500), 12)
  })

  it('clamps both speeds at the 5 km/h floor', () => {
    expect(deltaTimeAt(0, 4, 100)).toBe(0)
    expect(deltaTimeAt(-100, 5, 100)).toBe(0)
  })

  it('rejects non-finite speeds instead of producing NaN', () => {
    expect(deltaTimeAt(Number.NaN, 200, 100)).toBe(0)
    expect(deltaTimeAt(Number.POSITIVE_INFINITY, 200, 100)).toBe(0)
    expect(deltaTimeAt(180, Number.NEGATIVE_INFINITY, 100)).toBe(0)
  })

  it('handles zero distance', () => {
    expect(deltaTimeAt(180, 200, 0)).toBe(0)
  })

  it('rejects negative distance instead of reversing the sign', () => {
    expect(deltaTimeAt(180, 200, -100)).toBe(0)
  })
})

describe('cumulativeDelta edge cases', () => {
  it('returns an empty array for empty channels', () => {
    expect(cumulativeDelta([], [], 5821.3)).toEqual([])
  })

  it('returns an empty array for zero length', () => {
    expect(cumulativeDelta([180], [200], 0)).toEqual([])
  })

  it('returns an empty array for negative length', () => {
    expect(cumulativeDelta([180], [200], -1)).toEqual([])
  })

  it('returns an empty array for NaN length', () => {
    expect(cumulativeDelta([180], [200], Number.NaN)).toEqual([])
  })

  it('aligns to the shorter channel', () => {
    expect(cumulativeDelta([180, 180, 180], [200, 200], 600)).toHaveLength(2)
  })

  it('preserves a single sample', () => {
    const result = cumulativeDelta([180], [200], 100)
    expect(result).toHaveLength(1)
    expect(result[0]).toBeCloseTo(0.2, 10)
  })

  it('skips bins where either speed is null', () => {
    const result = cumulativeDelta([180, null, 180], [200, 200, 200], 300)
    expect(result[0]).toBeCloseTo(0.2, 10)
    expect(result[1]).toBeCloseTo(0.2, 10)
    expect(result[2]).toBeCloseTo(0.4, 10)
  })

  it('skips bins where either speed is zero', () => {
    const result = cumulativeDelta([180, 0, 180], [200, 200, 200], 300)
    expect(result[1]).toBe(result[0])
    expect(result[2]).toBeGreaterThan(result[1])
  })

  it('skips negative speeds rather than clamping them into the integral', () => {
    const result = cumulativeDelta([180, -50, 180], [200, 200, 200], 300)
    expect(result[1]).toBe(result[0])
  })

  it('skips NaN speeds rather than poisoning the accumulator', () => {
    const result = cumulativeDelta([180, Number.NaN, 180], [200, 200, 200], 300)
    expect(result[0]).toBeCloseTo(0.2, 10)
    expect(result[1]).toBeCloseTo(0.2, 10)
    expect(result[2]).toBeCloseTo(0.4, 10)
    expect(result.every((value) => Number.isFinite(value))).toBe(true)
  })

  it('handles a one-bin series', () => {
    const result = cumulativeDelta([180], [200], 100)
    expect(result[0]).toBeCloseTo(0.2, 10)
  })

  it('never decreases when A is consistently slower', () => {
    const result = cumulativeDelta([160, 170, 180], [200, 200, 200], 900)
    expect(result[0]).toBeLessThan(result[1])
    expect(result[1]).toBeLessThan(result[2])
  })

  it('never increases when A is consistently faster', () => {
    const result = cumulativeDelta([220, 215, 210], [200, 200, 200], 900)
    expect(result[0]).toBeGreaterThan(result[1])
    expect(result[1]).toBeGreaterThan(result[2])
    expect(result.every((value) => value < 0)).toBe(true)
  })

  it('is antisymmetric in aggregate', () => {
    const a = [180, 220, 200]
    const b = [200, 200, 200]
    const forward = cumulativeDelta(a, b, 900)
    const reverse = cumulativeDelta(b, a, 900)
    forward.forEach((value, index) => expect(value).toBeCloseTo(-reverse[index], 10))
  })

  it('handles identical channels', () => {
    const speed = [250, 300, 180]
    expect(cumulativeDelta(speed, speed, 900)).toEqual([0, 0, 0])
  })

  it('handles very large track lengths', () => {
    const result = cumulativeDelta([180], [200], 1e9)
    expect(result[0]).toBeCloseTo(2e6, 1)
  })

  it('rejects non-finite track length', () => {
    expect(cumulativeDelta([180], [200], Number.POSITIVE_INFINITY)).toEqual([])
  })

  it('accepts readonly arrays', () => {
    const a = [180, 200] as const
    const b = [200, 180] as const
    expect(cumulativeDelta(a, b, 200)).toHaveLength(2)
  })
})

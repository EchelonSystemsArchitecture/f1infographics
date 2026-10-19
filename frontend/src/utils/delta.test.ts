import { describe, expect, it } from 'vitest'
import { cumulativeDelta, deltaTimeAt } from './delta'

describe('deltaTimeAt', () => {
  it('returns 0 for equal speeds', () => {
    expect(deltaTimeAt(200, 200, 120)).toBe(0)
  })

  it('is positive when A is slower (A loses time)', () => {
    expect(deltaTimeAt(180, 200, 100)).toBeCloseTo(0.2, 6)
  })

  it('is antisymmetric under a swap of A and B', () => {
    expect(deltaTimeAt(200, 180, 100)).toBeCloseTo(-0.2, 6)
  })

  it('clamps sub-minimum speeds before dividing', () => {
    expect(deltaTimeAt(3, 5, 100)).toBe(0)
    expect(deltaTimeAt(0, 200, 100)).toBe(deltaTimeAt(5, 200, 100))
  })
})

describe('cumulativeDelta', () => {
  it('returns all zeros when both channels are equal', () => {
    const speed = [250, 300, 180, 90]
    expect(cumulativeDelta(speed, speed, 1000)).toEqual([0, 0, 0, 0])
  })

  it('integrates a constant speed offset over the track length', () => {
    const a = Array(10).fill(180)
    const b = Array(10).fill(200)
    const result = cumulativeDelta(a, b, 1000)
    expect(result).toHaveLength(10)
    expect(result[0]).toBeCloseTo(0.2, 6)
    expect(result[9]).toBeCloseTo(2.0, 6)
    for (let i = 1; i < 10; i++) {
      expect(result[i] - result[i - 1]).toBeCloseTo(0.2, 6)
    }
  })

  it('carries the accumulator across null bins', () => {
    const result = cumulativeDelta([180, null, 180], [200, 200, 200], 300)
    expect(result).toHaveLength(3)
    expect(result[0]).toBeCloseTo(0.2, 6)
    expect(result[1]).toBeCloseTo(0.2, 6)
    expect(result[2]).toBeCloseTo(0.4, 6)
  })

  it('aligns to the shorter channel', () => {
    const result = cumulativeDelta([180, 180, 180], [200, 200], 600)
    expect(result).toHaveLength(2)
    expect(result[1]).toBeCloseTo(1.2, 6)
  })

  it('returns an empty series for no bins or zero length', () => {
    expect(cumulativeDelta([], [], 5821.3)).toEqual([])
    expect(cumulativeDelta([180], [200], 0)).toEqual([])
  })
})

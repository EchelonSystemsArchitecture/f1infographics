import { describe, expect, it } from 'vitest'
import type { CircuitInfo } from '../api/client'
import { PAD, buildTrackLayout, project } from './circuitProjection'

function circuit(overrides: Partial<CircuitInfo> = {}): CircuitInfo {
  return {
    circuit_key: 2,
    circuit_name: 'Test Circuit',
    rotation: 0,
    path: { x: [0, 10, 10, 0, 0], y: [0, 0, 10, 10, 0] },
    corners: [{ number: 1, angle: 90, x: 10, y: 5, dist: 100 }],
    pit_loss: { normal: 20, sc: 12, vsc: 14 },
    length_m: 1000,
    ...overrides,
  }
}

describe('project', () => {
  it('is identity at zero rotation except for the y flip', () => {
    expect(project({ x: 3, y: 4 }, 0)).toEqual({ x: 3, y: -4 })
  })

  it('rotates 90 degrees', () => {
    const result = project({ x: 1, y: 0 }, 90)
    expect(result.x).toBeCloseTo(0, 10)
    expect(result.y).toBeCloseTo(-1, 10)
  })

  it('rotates 180 degrees', () => {
    const result = project({ x: 2, y: 3 }, 180)
    expect(result.x).toBeCloseTo(-2, 10)
    expect(result.y).toBeCloseTo(3, 10)
  })

  it('rotates 270 degrees', () => {
    const result = project({ x: 1, y: 0 }, 270)
    expect(result.x).toBeCloseTo(0, 10)
    expect(result.y).toBeCloseTo(1, 10)
  })

  it('treats 360 as identity', () => {
    const result = project({ x: 5, y: 6 }, 360)
    expect(result.x).toBeCloseTo(5, 10)
    expect(result.y).toBeCloseTo(-6, 10)
  })

  it('supports negative rotation', () => {
    const result = project({ x: 1, y: 0 }, -90)
    expect(result.x).toBeCloseTo(0, 10)
    expect(result.y).toBeCloseTo(1, 10)
  })

  it('should reject NaN rotation instead of returning NaN points', () => {
    const result = project({ x: 1, y: 2 }, Number.NaN)
    expect(Number.isNaN(result.x)).toBe(false)
  })
})

describe('buildTrackLayout', () => {
  it('returns null without a circuit', () => {
    expect(buildTrackLayout(null, [], 800)).toBeNull()
  })

  it('returns null when the path has fewer than two points', () => {
    expect(buildTrackLayout(circuit({ path: { x: [0], y: [0] } }), [], 800)).toBeNull()
  })

  it('returns null when x and y lengths differ', () => {
    expect(buildTrackLayout(circuit({ path: { x: [0, 1, 2], y: [0, 1] } }), [], 800)).toBeNull()
  })

  it('builds a closed SVG path', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    expect(layout.d.startsWith('M ')).toBe(true)
    expect(layout.d.trim().endsWith('Z')).toBe(true)
  })

  it('preserves the requested width', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    expect(layout.width).toBe(800)
  })

  it('produces finite positive height', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    expect(Number.isFinite(layout.height)).toBe(true)
    expect(layout.height).toBeGreaterThan(0)
  })

  it('keeps path points inside the padded viewport', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    for (const point of layout.pathPx) {
      expect(point.x).toBeGreaterThanOrEqual(PAD - 0.001)
      expect(point.x).toBeLessThanOrEqual(800 - PAD + 0.001)
      expect(point.y).toBeGreaterThanOrEqual(PAD - 0.001)
    }
  })

  it('centres the layout horizontally', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    const minX = Math.min(...layout.pathPx.map((point) => point.x))
    const maxX = Math.max(...layout.pathPx.map((point) => point.x))
    expect((minX + maxX) / 2).toBeCloseTo(400, 0)
  })

  it('scales down to maxHeight', () => {
    const tall = buildTrackLayout(circuit({ path: { x: [0, 10, 10, 0, 0], y: [0, 0, 100, 100, 0] } }), [], 800, 320)!
    expect(tall.height).toBeLessThanOrEqual(320 + 0.001)
  })

  it('honours maxHeight infinity by fitting width only', () => {
    const layout = buildTrackLayout(circuit(), [], 800)!
    expect(Number.isFinite(layout.height)).toBe(true)
  })

  it('projects corners into the same space as the path', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    expect(layout.corners).toHaveLength(1)
    expect(layout.corners[0].number).toBe(1)
    expect(layout.corners[0].dist).toBe(100)
  })

  it('projects markers and preserves metadata', () => {
    const layout = buildTrackLayout(
      circuit(),
      [{ driver_number: 44, x: 5, y: 5, interpolated: true }],
      800,
      600,
    )!
    expect(layout.markers).toHaveLength(1)
    expect(layout.markers[0]).toMatchObject({ driver_number: 44, interpolated: true })
  })

  it('keeps markers inside the track bounds for in-bounds coordinates', () => {
    const layout = buildTrackLayout(
      circuit(),
      [{ driver_number: 1, x: 5, y: 5, interpolated: false }],
      800,
      600,
    )!
    expect(layout.markers[0].x).toBeGreaterThanOrEqual(PAD)
    expect(layout.markers[0].x).toBeLessThanOrEqual(800 - PAD)
  })

  it('produces a start/finish line perpendicular to the first segment', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    if (layout.pathPx[0].x === layout.pathPx[1].x) {
      expect(layout.sf.y1).toBe(layout.sf.y2)
    } else if (layout.pathPx[0].y === layout.pathPx[1].y) {
      expect(layout.sf.x1).toBe(layout.sf.x2)
    } else {
      expect(Math.hypot(layout.sf.x2 - layout.sf.x1, layout.sf.y2 - layout.sf.y1)).toBeGreaterThan(0)
    }
  })

  it('reports centre coordinates', () => {
    const layout = buildTrackLayout(circuit(), [], 800, 600)!
    expect(layout.centerX).toBe(400)
    expect(layout.centerY).toBe(layout.height / 2)
  })

  it('handles a rotation of 92 degrees', () => {
    const layout = buildTrackLayout(circuit({ rotation: 92 }), [], 800, 600)!
    expect(layout.pathPx.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true)
  })

  it('should keep a tiny viewport inside its width', () => {
    const layout = buildTrackLayout(circuit(), [], 10, 10)!
    for (const point of layout.pathPx) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(10)
    }
  })

  it('should reject NaN coordinates instead of emitting NaN paths', () => {
    const bad = circuit({ path: { x: [0, Number.NaN, 10, 0, 0], y: [0, 0, 10, 10, 0] } })
    expect(buildTrackLayout(bad, [], 800, 600)).toBeNull()
  })

  it('should reject NaN rotation', () => {
    const bad = circuit({ rotation: Number.NaN })
    expect(buildTrackLayout(bad, [], 800, 600)).toBeNull()
  })

  it('handles a degenerate zero-span path without dividing by zero', () => {
    const layout = buildTrackLayout(circuit({ path: { x: [0, 0, 0], y: [0, 0, 0] } }), [], 800, 600)!
    expect(Number.isFinite(layout.height)).toBe(true)
  })

  it('handles negative coordinates', () => {
    const layout = buildTrackLayout(
      circuit({ path: { x: [-100, -50, -50, -100, -100], y: [-100, -100, -50, -50, -100] } }),
      [],
      800,
      600,
    )!
    expect(layout.pathPx.every((point) => Number.isFinite(point.x))).toBe(true)
  })
})

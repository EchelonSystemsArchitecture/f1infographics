import type { CircuitInfo, CircuitPoint } from '../api/client'

export const ROTATION_DEG = 84.25
export const FLIP_Y = true
export const PAD = 18

export interface PxPoint {
  x: number
  y: number
}

export interface MarkerPoint {
  driver_number: number
  x: number
  y: number
  interpolated: boolean
}

export interface LayoutCorner extends PxPoint {
  number: number
  dist: number | null
}

export interface LayoutMarker extends PxPoint {
  driver_number: number
  interpolated: boolean
}

export interface TrackLayout {
  d: string
  pathPx: PxPoint[]
  corners: LayoutCorner[]
  markers: LayoutMarker[]
  width: number
  height: number
  sf: { x1: number; y1: number; x2: number; y2: number }
  centerX: number
  centerY: number
}

export function project(p: CircuitPoint): PxPoint {
  const th = (ROTATION_DEG * Math.PI) / 180
  const c = Math.cos(th)
  const s = Math.sin(th)
  let xp = p.x * c - p.y * s
  let yp = p.x * s + p.y * c
  if (FLIP_Y) yp = -yp
  return { x: xp, y: yp }
}

export function buildTrackLayout(
  circuit: CircuitInfo | null,
  markers: MarkerPoint[],
  width: number,
): TrackLayout | null {
  if (!circuit || circuit.path.x.length < 2 || circuit.path.x.length !== circuit.path.y.length)
    return null
  const pts: CircuitPoint[] = circuit.path.x.map((x, i) => ({ x, y: circuit.path.y[i] }))
  const projected = pts.map(project)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of projected) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const bw = Math.max(maxX - minX, 1)
  const bh = Math.max(maxY - minY, 1)
  const scale = (width - 2 * PAD) / bw
  const height = bh * scale + 2 * PAD
  const toPx = (p: PxPoint): PxPoint => ({
    x: (p.x - minX) * scale + PAD,
    y: (p.y - minY) * scale + PAD,
  })
  const pathPx = projected.map(toPx)
  const corners = circuit.corners.map((c) => {
    const px = toPx(project(c))
    return { number: c.number, x: px.x, y: px.y, dist: c.dist }
  })
  const markersPx = markers.map((m) => {
    const px = toPx(project(m))
    return { driver_number: m.driver_number, x: px.x, y: px.y, interpolated: m.interpolated }
  })
  const d =
    pathPx.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
  const a = pathPx[0]
  const b = pathPx[1]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const sf = { x1: a.x - nx * 8, y1: a.y - ny * 8, x2: a.x + nx * 8, y2: a.y + ny * 8 }
  return { d, pathPx, corners, markers: markersPx, width, height, sf, centerX: width / 2, centerY: height / 2 }
}

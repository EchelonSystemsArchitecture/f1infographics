import type { CircuitInfo, CircuitPoint } from '../api/client'

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

export function project(p: CircuitPoint, rotationDeg: number): PxPoint {
  const th = (rotationDeg * Math.PI) / 180
  const c = Math.cos(th)
  const s = Math.sin(th)
  const xp = p.x * c - p.y * s
  const yp = -(p.x * s + p.y * c)
  return { x: xp, y: yp }
}

export function buildTrackLayout(
  circuit: CircuitInfo | null,
  markers: MarkerPoint[],
  width: number,
  maxHeight: number = Number.POSITIVE_INFINITY,
): TrackLayout | null {
  if (!circuit || circuit.path.x.length < 2 || circuit.path.x.length !== circuit.path.y.length)
    return null
  const rotation = circuit.rotation ?? 0
  const pts: CircuitPoint[] = circuit.path.x.map((x, i) => ({ x, y: circuit.path.y[i] }))
  const projected = pts.map((p) => project(p, rotation))
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
  const scaleW = (width - 2 * PAD) / bw
  const scaleH = maxHeight === Number.POSITIVE_INFINITY ? scaleW : (maxHeight - 2 * PAD) / bh
  const scale = Math.min(scaleW, scaleH)
  const outW = bw * scale + 2 * PAD
  const outH = bh * scale + 2 * PAD
  const toPx = (p: PxPoint): PxPoint => ({
    x: (p.x - minX) * scale + PAD + (width - outW) / 2,
    y: (p.y - minY) * scale + PAD + (0 - 0),
  })
  const pathPx = projected.map(toPx)
  const corners = circuit.corners.map((c) => {
    const px = toPx(project(c, rotation))
    return { number: c.number, x: px.x, y: px.y, dist: c.dist }
  })
  const markersPx = markers.map((m) => {
    const px = toPx(project(m, rotation))
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
  return {
    d,
    pathPx,
    corners,
    markers: markersPx,
    width,
    height: outH,
    sf,
    centerX: width / 2,
    centerY: outH / 2,
  }
}

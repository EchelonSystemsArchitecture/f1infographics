import { useMemo } from 'react'
import type { CircuitInfo, CircuitPoint } from '../../api/client'
import './TrackMap.css'

export interface TrackMapMarker {
  driver_number: number
  x: number
  y: number
  interpolated: boolean
}

const ROTATION_DEG = 84.25
const FLIP_Y = true
const PAD = 18
const MARKER_R = 6
const CORNER_LABEL_OFFSET = 12

function project(p: CircuitPoint): { x: number; y: number } {
  const th = (ROTATION_DEG * Math.PI) / 180
  const c = Math.cos(th)
  const s = Math.sin(th)
  let xp = p.x * c - p.y * s
  let yp = p.x * s + p.y * c
  if (FLIP_Y) yp = -yp
  return { x: xp, y: yp }
}

interface PxPoint {
  x: number
  y: number
}

export function TrackMap({
  circuit,
  markers,
  colours,
  width = 520,
}: {
  circuit: CircuitInfo | null
  markers: TrackMapMarker[]
  colours: Map<number, string>
  width?: number
}) {
  const layout = useMemo(() => {
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
    const toPx = (p: { x: number; y: number }): PxPoint => ({
      x: (p.x - minX) * scale + PAD,
      y: (p.y - minY) * scale + PAD,
    })
    const pathPx = projected.map(toPx)
    const corners = circuit.corners.map((c) => {
      const px = toPx(project(c))
      return { number: c.number, x: px.x, y: px.y }
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
  }, [circuit, markers, width])

  if (!layout) {
    return (
      <svg className="tm" width={width} height={width * 0.62} viewBox={`0 0 ${width} ${width * 0.62}`}>
        <text className="tm__empty" x={width / 2} y={(width * 0.62) / 2}>
          CIRCUIT MAP UNAVAILABLE
        </text>
      </svg>
    )
  }

  return (
    <svg className="tm" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}>
      <path className="tm__bed" d={layout.d} />
      <path className="tm__line" d={layout.d} />
      <line className="tm__sf" x1={layout.sf.x1} y1={layout.sf.y1} x2={layout.sf.x2} y2={layout.sf.y2} />
      {layout.corners.map((c) => {
        const vx = c.x - layout.centerX
        const vy = c.y - layout.centerY
        const vl = Math.hypot(vx, vy) || 1
        const lx = c.x + (vx / vl) * CORNER_LABEL_OFFSET
        const ly = c.y + (vy / vl) * CORNER_LABEL_OFFSET
        return (
          <g key={`corner-${c.number}`}>
            <circle className="tm__corner-dot" cx={c.x} cy={c.y} r={1.6} />
            <text className="tm__corner-label" x={lx} y={ly}>
              {c.number}
            </text>
          </g>
        )
      })}
      {layout.markers.map((m) => {
        const colour = colours.get(m.driver_number)
        return (
          <g key={`marker-${m.driver_number}`} className={m.interpolated ? 'tm__marker tm__marker--interp' : 'tm__marker'}>
            <title>{`#${m.driver_number}${m.interpolated ? ' (interpolated)' : ''}`}</title>
            {m.interpolated && (
              <circle className="tm__ring" cx={m.x} cy={m.y} r={MARKER_R + 3} stroke={colour ?? 'var(--gt-text-disabled)'} />
            )}
            <circle
              className="tm__dot"
              cx={m.x}
              cy={m.y}
              r={MARKER_R}
              fill={colour ?? 'var(--gt-text-disabled)'}
            />
            <text className="tm__num" x={m.x} y={m.y}>
              {m.driver_number}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

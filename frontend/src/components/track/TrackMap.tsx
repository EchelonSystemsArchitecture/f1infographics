import { useMemo } from 'react'
import type { CircuitInfo } from '../../api/client'
import { buildTrackLayout, type MarkerPoint } from '../../utils/circuitProjection'
import './TrackMap.css'

export type { MarkerPoint as TrackMapMarker } from '../../utils/circuitProjection'

const MARKER_R = 6
const CORNER_LABEL_OFFSET = 12

export function TrackMap({
  circuit,
  markers,
  colours,
  width = 520,
}: {
  circuit: CircuitInfo | null
  markers: MarkerPoint[]
  colours: Map<number, string>
  width?: number
}) {
  const layout = useMemo(() => buildTrackLayout(circuit, markers, width), [circuit, markers, width])

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

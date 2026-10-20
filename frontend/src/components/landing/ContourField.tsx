import { useMemo } from 'react'
import './ContourField.css'

type ContourFieldProps = {
  className?: string
}

const CONTOUR_RINGS = 16
const ORBIT_ARCS = 7

function buildContours(): { cx: number; cy: number; rx: number; ry: number; rot: number }[] {
  const cx = 500
  const cy = 420
  const rings = []
  for (let i = 0; i < CONTOUR_RINGS; i++) {
    const t = i / (CONTOUR_RINGS - 1)
    rings.push({
      cx,
      cy,
      rx: 40 + t * 430,
      ry: 26 + t * 300,
      rot: -18 + t * 46,
    })
  }
  return rings
}

function buildArcs(): string[] {
  const cx = 500
  const cy = 420
  const arcs: string[] = []
  for (let i = 0; i < ORBIT_ARCS; i++) {
    const r = 180 + i * 150
    const start = -0.7 + i * 0.16
    const sweep = 2.1 + i * 0.12
    const x1 = cx + Math.cos(start) * r * 1.9
    const y1 = cy + Math.sin(start) * r
    const x2 = cx + Math.cos(start + sweep) * r * 1.9
    const y2 = cy + Math.sin(start + sweep) * r
    arcs.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r * 1.9} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`)
  }
  return arcs
}

export function ContourField({ className = '' }: ContourFieldProps) {
  const contours = useMemo(() => buildContours(), [])
  const arcs = useMemo(() => buildArcs(), [])

  return (
    <div className={`gt-contours ${className}`} aria-hidden="true">
      <svg
        className="gt-contours__svg"
        viewBox="0 0 1000 840"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <radialGradient id="gt-contour-fade" cx="50%" cy="50%" r="62%">
            <stop offset="0%" stopColor="var(--gt-signal)" stopOpacity="0.16" />
            <stop offset="55%" stopColor="var(--gt-text-muted)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--gt-canvas)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="gt-contours__rings">
          <rect x="0" y="0" width="1000" height="840" fill="url(#gt-contour-fade)" opacity="0.5" />
          {contours.map((ring, i) => (
            <ellipse
              key={`c${i}`}
              cx={ring.cx}
              cy={ring.cy}
              rx={ring.rx}
              ry={ring.ry}
              transform={`rotate(${ring.rot} ${ring.cx} ${ring.cy})`}
              fill="none"
              stroke="var(--gt-border-subtle)"
              strokeWidth={i % 4 === 0 ? 1.1 : 0.6}
              opacity={0.10 + (i / CONTOUR_RINGS) * 0.18}
            />
          ))}
        </g>
        <g className="gt-contours__arcs">
          {arcs.map((d, i) => (
            <path
              key={`a${i}`}
              d={d}
              fill="none"
              stroke={i === 2 ? 'var(--gt-signal)' : 'var(--gt-border-subtle)'}
              strokeWidth={i === 2 ? 1.2 : 0.7}
              opacity={i === 2 ? 0.30 : 0.16}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

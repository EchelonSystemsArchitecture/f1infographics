import { useMemo } from 'react'
import { contours } from 'd3-contour'
import { geoPath } from 'd3-geo'

function hash(x: number, y: number, seed: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return s - Math.floor(s)
}

function smoothNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x: number, y: number, seed: number) {
  let v = 0
  let amp = 0.55
  let f = 1
  for (let o = 0; o < 4; o++) {
    v += amp * smoothNoise(x * f, y * f, seed + o * 13)
    f *= 2
    amp *= 0.5
  }
  return v
}

export function Topo({
  seed = 1,
  levels = 14,
  color = 'currentColor',
  opacity = 0.18,
  className,
}: {
  seed?: number
  levels?: number
  color?: string
  opacity?: number
  className?: string
}) {
  const paths = useMemo(() => {
    const w = 120
    const h = 80
    const values = new Float64Array(w * h)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) values[j * w + i] = fbm(i / 26, j / 26, seed)
    const thresholds = Array.from({ length: levels }, (_, k) => 0.22 + (k / levels) * 0.6)
    const gen = contours().size([w, h]).thresholds(thresholds).smooth(true)
    const path = geoPath()
    return gen(Array.from(values)).map((c) => path(c) ?? '')
  }, [seed, levels])

  return (
    <svg
      className={className}
      viewBox="1 1 118 78"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={0.12} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

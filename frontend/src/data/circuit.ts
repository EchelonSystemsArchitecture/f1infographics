import raw from './silverstone.json'

export interface CircuitData {
  name: string
  lengthM: number
  points: [number, number][]
  corners: { number: number; x: number; y: number }[]
}

function normalize(): CircuitData {
  const xs = raw.path.x
  const ys = raw.path.y
  const rot = (-(raw.rotation ?? 0) * Math.PI) / 180
  const pts = xs.map((x, i) => {
    const y = ys[i]
    return [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)] as [number, number]
  })
  const minX = Math.min(...pts.map((p) => p[0]))
  const maxX = Math.max(...pts.map((p) => p[0]))
  const minY = Math.min(...pts.map((p) => p[1]))
  const maxY = Math.max(...pts.map((p) => p[1]))
  const span = Math.max(maxX - minX, maxY - minY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const norm = (x: number, y: number): [number, number] => [((x - cx) / span) * 2, (-(y - cy) / span) * 2]
  const corners = (raw.corners ?? []).map((c) => {
    const rx = c.x * Math.cos(rot) - c.y * Math.sin(rot)
    const ry = c.x * Math.sin(rot) + c.y * Math.cos(rot)
    const [nx, ny] = norm(rx, ry)
    return { number: c.number, x: nx, y: ny }
  })
  return {
    name: raw.circuit_name,
    lengthM: raw.length_m,
    points: pts.map(([x, y]) => norm(x, y)),
    corners,
  }
}

export const SILVERSTONE = normalize()

export function circuitPathD(size = 100, pad = 6) {
  const s = (size - pad * 2) / 2
  const c = size / 2
  return (
    SILVERSTONE.points.map(([x, y], i) => `${i ? 'L' : 'M'}${(c + x * s).toFixed(2)} ${(c + y * s).toFixed(2)}`).join(' ') + ' Z'
  )
}

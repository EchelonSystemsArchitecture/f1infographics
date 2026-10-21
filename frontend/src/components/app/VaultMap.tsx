import { useEffect, useMemo, useState } from 'react'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import land110 from 'world-atlas/land-110m.json'
import { api, type CircuitInfo, type EventSummary } from '../../api/client'
import { CIRCUIT_GEO } from '../../data/circuitGeo'

const W = 1000
const H = 420

function geoFor(ev: EventSummary): [number, number] | null {
  if (ev.lat != null && ev.long != null) return [ev.lat, ev.long]
  return CIRCUIT_GEO[ev.circuit_name] ?? CIRCUIT_GEO[ev.locality ?? ''] ?? null
}

export function VaultMap({ events, hover, onHover, onPick }: {
  events: EventSummary[]
  hover: number | null
  onHover: (round: number | null) => void
  onPick: (ev: EventSummary) => void
}) {
  const { landD, proj } = useMemo(() => {
    const topo = land110 as unknown as Topology<{ land: GeometryCollection }>
    const land = feature(topo, topo.objects.land)
    const proj = geoEquirectangular().fitExtent([[0, 0], [W, H]], { type: 'Sphere' } as never).center([10, 18]).scale(170).translate([W / 2, H / 2])
    return { landD: geoPath(proj)(land) ?? '', proj }
  }, [])

  return (
    <svg className="vmap" viewBox={`0 0 ${W} ${H}`} aria-label="Season map">
      <defs>
        <pattern id="vmap-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="rgba(241,236,228,0.05)" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#vmap-grid)" />
      <path d={landD} className="vmap__land" />
      {events.map((ev) => {
        const ll = geoFor(ev)
        if (!ll) return null
        const p = proj([ll[1], ll[0]])
        if (!p) return null
        const on = hover === ev.round
        const ok = ev.ingested && ev.session_key != null
        return (
          <g
            key={ev.round}
            className={`vmap__pin${on ? ' is-on' : ''}${ok ? '' : ' is-off'}`}
            transform={`translate(${p[0]} ${p[1]})`}
            onPointerEnter={() => onHover(ev.round)}
            onPointerLeave={() => onHover(null)}
            onClick={() => ok && onPick(ev)}
          >
            <circle r={on ? 7 : 4} />
            <g transform="translate(6 -16)">
              <rect width="22" height="13" rx="2" />
              <text x="11" y="9.5">{String(ev.round).padStart(2, '0')}</text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

export function TrackThumb({ sessionKey }: { sessionKey: number | null }) {
  const [c, setC] = useState<CircuitInfo | null>(null)
  useEffect(() => {
    if (sessionKey == null) return
    let off = false
    api.circuit(sessionKey).then((x) => !off && setC(x)).catch(() => {})
    return () => {
      off = true
    }
  }, [sessionKey])
  const d = useMemo(() => {
    if (!c) return ''
    const th = ((c.rotation ?? 0) * Math.PI) / 180
    const pts = c.path.x.map((x, i) => {
      const y = c.path.y[i]
      return [x * Math.cos(th) - y * Math.sin(th), -(x * Math.sin(th) + y * Math.cos(th))]
    })
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const s = 88 / Math.max(maxX - minX, maxY - minY)
    const ox = (100 - (maxX - minX) * s) / 2
    const oy = (60 - (maxY - minY) * s * 0.62) / 2
    return pts.map((p, i) => `${i ? 'L' : 'M'}${(ox + (p[0] - minX) * s).toFixed(1)} ${(oy + (p[1] - minY) * s * 0.62).toFixed(1)}`).join('') + 'Z'
  }, [c])
  return (
    <svg className="vthumb" viewBox="0 0 100 60" aria-hidden="true">
      {d && <path d={d} />}
    </svg>
  )
}

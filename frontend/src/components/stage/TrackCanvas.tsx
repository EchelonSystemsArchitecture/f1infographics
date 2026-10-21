import { useEffect, useRef, useState } from 'react'
import type { CircuitInfo } from '../../api/client'
import './TrackCanvas.css'

interface Marker {
  driver_number: number
  x: number
  y: number
  interpolated: boolean
}

export interface Conditions {
  night: boolean
  dusk: boolean
  rain: boolean
  track: number | null
  air: number | null
  localHour: number
  flag: 'sc' | 'vsc' | 'red' | null
}

interface Car {
  x: number
  y: number
  tx: number
  ty: number
  trail: { x: number; y: number }[]
  seen: boolean
}

const SHELL = new Path2D('M-9.6 5.6 L-9.6 1.2 C-9.6 -5.4 -4.4 -9.6 1.4 -9.6 C6.6 -9.6 10.4 -5.6 10.4 -0.4 C10.4 2.6 9.4 4.6 8 5.6 Z')
const BASE = new Path2D('M-9.6 5.6 L8 5.6 L7.2 7 L-9.6 7 Z')
const VISOR = new Path2D('M-9.6 -1.4 L-6 -6 L1.8 -5.2 C3.8 -5 4.4 -2.4 3 -1 L0.6 1.8 L-9.6 2.6 Z')
const STRIPE = new Path2D('M5.2 -7 C8.2 -5.6 9.2 -2.6 8.6 1.2')
const TRAIL_LEN = 28

function project(x: number, y: number, rot: number) {
  const th = (rot * Math.PI) / 180
  const c = Math.cos(th)
  const s = Math.sin(th)
  return { x: x * c - y * s, y: -(x * s + y * c) }
}

export function TrackCanvas({
  circuit,
  markers,
  colours,
  names,
  selected,
  onSelectDriver,
  conditions,
}: {
  conditions?: Conditions
  circuit: CircuitInfo | null
  markers: Marker[]
  colours: Map<number, string>
  names: Map<number, string>
  selected: number | null
  onSelectDriver: (n: number | null) => void
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const cars = useRef(new Map<number, Car>())
  const view = useRef({ zoom: 1, panX: 0, panY: 0, tZoom: 1, tPanX: 0, tPanY: 0 })
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)
  const props = useRef({ colours, names, selected, follow: false, conditions: conditions as Conditions | undefined })
  const [follow, setFollow] = useState(false)
  const [zoomLabel, setZoomLabel] = useState(100)

  props.current = { colours, names, selected, follow, conditions }

  const geo = useRef<{ pts: { x: number; y: number }[]; corners: { n: number; x: number; y: number }[]; cx: number; cy: number; span: number; rot: number } | null>(null)
  useEffect(() => {
    if (!circuit || circuit.path.x.length < 2) return
    const rot = circuit.rotation ?? 0
    const pts = circuit.path.x.map((x, i) => project(x, circuit.path.y[i], rot))
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    geo.current = {
      pts,
      corners: circuit.corners.map((c) => ({ n: c.number, ...project(c.x, c.y, rot) })),
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      span: Math.max(maxX - minX, maxY - minY),
      rot,
    }
  }, [circuit])

  useEffect(() => {
    const g = geo.current
    const rot = g?.rot ?? circuit?.rotation ?? 0
    const live = new Set<number>()
    for (const m of markers) {
      const p = project(m.x, m.y, rot)
      live.add(m.driver_number)
      const c = cars.current.get(m.driver_number)
      if (!c) {
        cars.current.set(m.driver_number, { x: p.x, y: p.y, tx: p.x, ty: p.y, trail: [], seen: true })
      } else {
        const jump = Math.hypot(p.x - c.x, p.y - c.y) > (g ? g.span * 0.25 : Infinity)
        if (jump) {
          c.x = p.x
          c.y = p.y
          c.trail = []
        }
        c.tx = p.x
        c.ty = p.y
        c.seen = true
      }
    }
    for (const [k, c] of cars.current) if (!live.has(k)) c.seen = false
  }, [markers, circuit])

  useEffect(() => {
    const cv = canvas.current
    const el = wrap.current
    if (!cv || !el) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const r = el.getBoundingClientRect()
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
      cv.style.width = `${r.width}px`
      cv.style.height = `${r.height}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const css = getComputedStyle(el)
    const primary = css.getPropertyValue('--team-primary').trim() || '#ff8000'

    const frame = () => {
      if (!running) return
      const g = geo.current
      const W = cv.width / dpr
      const H = cv.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (g) {
        const v = view.current
        const { selected: sel, follow: fol, colours: col, names: nm, conditions: cond } = props.current
        const now = performance.now()
        if (fol && sel != null) {
          const c = cars.current.get(sel)
          if (c) {
            v.tPanX = -(c.x - g.cx)
            v.tPanY = -(c.y - g.cy)
            v.tZoom = Math.max(v.tZoom, 2.4)
          }
        }
        v.zoom += (v.tZoom - v.zoom) * 0.14
        v.panX += (v.tPanX - v.panX) * 0.14
        v.panY += (v.tPanY - v.panY) * 0.14
        const base = (Math.min(W, H) * 0.86) / g.span
        const k = base * v.zoom
        const toS = (x: number, y: number) => ({ x: W / 2 + (x - g.cx + v.panX) * k, y: H / 2 + (y - g.cy + v.panY) * k })

        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const trace = () => {
          ctx.beginPath()
          g.pts.forEach((p, i) => {
            const s = toS(p.x, p.y)
            if (i) ctx.lineTo(s.x, s.y)
            else ctx.moveTo(s.x, s.y)
          })
          ctx.closePath()
        }
        const tw = Math.max(10, Math.min(46, 14 * Math.sqrt(v.zoom)))
        if (cond?.night) {
          ctx.fillStyle = 'rgba(3,5,14,0.55)'
          ctx.fillRect(0, 0, W, H)
        } else if (cond?.dusk) {
          const gr = ctx.createLinearGradient(0, 0, 0, H)
          gr.addColorStop(0, 'rgba(255,120,40,0.10)')
          gr.addColorStop(1, 'rgba(40,20,60,0.25)')
          ctx.fillStyle = gr
          ctx.fillRect(0, 0, W, H)
        }
        trace()
        if (cond?.night) {
          ctx.strokeStyle = 'rgba(255,238,205,0.07)'
          ctx.lineWidth = tw + 70
          ctx.stroke()
          ctx.strokeStyle = 'rgba(255,238,205,0.10)'
          ctx.lineWidth = tw + 30
          ctx.stroke()
        } else {
          ctx.strokeStyle = 'rgba(255,128,0,0.06)'
          ctx.lineWidth = tw + 22
          ctx.stroke()
        }
        const flagCol = cond?.flag === 'red' ? '255,46,46' : cond?.flag ? '255,209,46' : null
        if (flagCol) {
          const pulse = 0.45 + 0.35 * Math.sin(now / 260)
          ctx.strokeStyle = `rgba(${flagCol},${pulse})`
          ctx.lineWidth = tw + 10
          ctx.stroke()
        }
        const neon = cond?.rain ? '#3fa9ff' : primary
        const core = cond?.rain ? '#cfeaff' : '#ffd84a'
        const lw = Math.max(5, tw * 0.55)
        ctx.save()
        ctx.shadowColor = neon
        ctx.shadowBlur = 24
        ctx.strokeStyle = neon
        ctx.lineWidth = lw
        ctx.stroke()
        ctx.shadowBlur = 10
        ctx.stroke()
        ctx.restore()
        ctx.strokeStyle = '#0d0c0b'
        ctx.lineWidth = lw * 0.62
        ctx.stroke()
        ctx.save()
        ctx.shadowColor = core
        ctx.shadowBlur = 8
        ctx.strokeStyle = core
        ctx.lineWidth = Math.max(1.6, lw * 0.26)
        ctx.stroke()
        ctx.restore()

        const a = toS(g.pts[0].x, g.pts[0].y)
        const b = toS(g.pts[1].x, g.pts[1].y)
        const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2
        ctx.save()
        ctx.translate(a.x, a.y)
        ctx.rotate(ang)
        for (let i = -3; i < 3; i++) {
          ctx.fillStyle = i % 2 ? '#f1ece4' : '#111'
          ctx.fillRect((i * tw) / 6, -2.5, tw / 6, 5)
        }
        ctx.restore()

        ctx.save()
        ctx.translate(a.x, a.y)
        ctx.rotate(ang - Math.PI / 2)
        ctx.fillStyle = '#f1ece4'
        ctx.beginPath()
        ctx.moveTo(lw + 14, 0)
        ctx.lineTo(lw + 4, -6)
        ctx.lineTo(lw + 4, 6)
        ctx.closePath()
        ctx.fill()
        ctx.restore()

        const gcx = W / 2 + v.panX * k
        const gcy = H / 2 + v.panY * k
        ctx.font = '800 10px "Archivo Variable", Archivo, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (const c of g.corners) {
          const s = toS(c.x, c.y)
          const dx = s.x - gcx
          const dy = s.y - gcy
          const dl = Math.hypot(dx, dy) || 1
          const off = lw + 14
          const bx = s.x + (dx / dl) * off
          const by = s.y + (dy / dl) * off
          ctx.strokeStyle = 'rgba(241,236,228,0.35)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(s.x + (dx / dl) * lw * 0.6, s.y + (dy / dl) * lw * 0.6)
          ctx.lineTo(bx - (dx / dl) * 8, by - (dy / dl) * 8)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(bx, by, 8, 0, Math.PI * 2)
          ctx.fillStyle = '#0d0c0b'
          ctx.fill()
          ctx.strokeStyle = neon
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.fillStyle = '#f1ece4'
          ctx.fillText(String(c.n), bx, by + 0.5)
        }

        if (cond?.rain) {
          ctx.strokeStyle = 'rgba(170,200,235,0.28)'
          ctx.lineWidth = 1
          ctx.beginPath()
          for (let i = 0; i < 160; i++) {
            const sx = ((i * 97.3 + now * 0.35) % (W + 40)) - 20
            const sy = ((i * 53.7 + now * 0.9) % (H + 40)) - 20
            ctx.moveTo(sx, sy)
            ctx.lineTo(sx - 4, sy + 12)
          }
          ctx.stroke()
        }
        const list = [...cars.current.entries()]
        for (const [, c] of list) {
          c.x += (c.tx - c.x) * 0.1
          c.y += (c.ty - c.y) * 0.1
          const last = c.trail[c.trail.length - 1]
          if (!last || Math.hypot(last.x - c.x, last.y - c.y) > g.span / 400) {
            c.trail.push({ x: c.x, y: c.y })
            if (c.trail.length > TRAIL_LEN) c.trail.shift()
          }
        }
        for (const [n, c] of list) {
          if (!c.seen || c.trail.length < 2) continue
          const colr = col.get(n) ?? '#9a948b'
          for (let i = 1; i < c.trail.length; i++) {
            const p0 = toS(c.trail[i - 1].x, c.trail[i - 1].y)
            const p1 = toS(c.trail[i].x, c.trail[i].y)
            ctx.globalAlpha = (i / c.trail.length) * (sel == null || sel === n ? 0.7 : 0.2)
            ctx.strokeStyle = colr
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(p0.x, p0.y)
            ctx.lineTo(p1.x, p1.y)
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1

        const hs = Math.max(1.3, Math.min(3.2, 1.3 * Math.sqrt(v.zoom)))
        const order = list.filter(([, c]) => c.seen).sort((x, y) => (x[0] === sel ? 1 : y[0] === sel ? -1 : x[1].y - y[1].y))
        for (const [n, c] of order) {
          const s = toS(c.x, c.y)
          const dim = sel != null && sel !== n
          ctx.save()
          ctx.translate(s.x, s.y)
          ctx.globalAlpha = dim ? 0.45 : 1
          if (sel === n) {
            ctx.beginPath()
            ctx.arc(0, 0, 13 * hs, 0, Math.PI * 2)
            ctx.strokeStyle = primary
            ctx.lineWidth = 2
            ctx.stroke()
            ctx.fillStyle = 'rgba(255,128,0,0.12)'
            ctx.fill()
          }
          ctx.scale(hs, hs)
          ctx.fillStyle = 'rgba(0,0,0,0.55)'
          ctx.beginPath()
          ctx.ellipse(0, 7.6, 9.5, 1.8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = col.get(n) ?? '#9a948b'
          ctx.fill(SHELL)
          ctx.strokeStyle = '#0a0908'
          ctx.lineWidth = 0.9
          ctx.stroke(SHELL)
          ctx.fillStyle = '#20242b'
          ctx.fill(BASE)
          ctx.fill(VISOR)
          ctx.strokeStyle = '#c81e1e'
          ctx.lineWidth = 1.2
          ctx.stroke(STRIPE)
          ctx.fillStyle = '#fff'
          ctx.font = '900 5.8px "Archivo Variable", Archivo, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(n), -3.2, -1.4)
          ctx.restore()
          if (sel === n || v.zoom > 2.2) {
            const label = nm.get(n) ?? `#${n}`
            ctx.font = '800 11px "Archivo Variable", Archivo, sans-serif'
            const w = ctx.measureText(label).width + 14
            const lx = s.x + 12 * hs
            const ly = s.y - 16 * hs
            ctx.globalAlpha = dim ? 0.45 : 1
            ctx.fillStyle = sel === n ? primary : 'rgba(12,11,10,0.85)'
            ctx.beginPath()
            ctx.roundRect(lx, ly - 9, w, 18, 9)
            ctx.fill()
            ctx.fillStyle = sel === n ? '#140a00' : '#f1ece4'
            ctx.textAlign = 'left'
            ctx.fillText(label, lx + 7, ly + 0.5)
            ctx.globalAlpha = 1
          }
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    const onVis = () => {
      running = !document.hidden
      if (running) raf = requestAnimationFrame(frame)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const toWorld = (clientX: number, clientY: number) => {
    const g = geo.current
    const el = wrap.current
    if (!g || !el) return null
    const r = el.getBoundingClientRect()
    const v = view.current
    const k = ((Math.min(r.width, r.height) * 0.86) / g.span) * v.zoom
    return { x: (clientX - r.left - r.width / 2) / k + g.cx - v.panX, y: (clientY - r.top - r.height / 2) / k + g.cy - v.panY, k, r }
  }

  const zoomBy = (f: number, clientX?: number, clientY?: number) => {
    const v = view.current
    const g = geo.current
    const el = wrap.current
    if (!g || !el) return
    const r = el.getBoundingClientRect()
    const cx = clientX ?? r.left + r.width / 2
    const cy = clientY ?? r.top + r.height / 2
    const before = toWorld(cx, cy)
    const nz = Math.max(0.6, Math.min(8, v.tZoom * f))
    const k2 = ((Math.min(r.width, r.height) * 0.86) / g.span) * nz
    if (before) {
      v.tPanX = (cx - r.left - r.width / 2) / k2 - before.x + g.cx
      v.tPanY = (cy - r.top - r.height / 2) / k2 - before.y + g.cy
    }
    v.tZoom = nz
    setZoomLabel(Math.round(nz * 100))
    setFollow(false)
  }

  const fit = () => {
    const v = view.current
    v.tZoom = 1
    v.tPanX = 0
    v.tPanY = 0
    setZoomLabel(100)
    setFollow(false)
  }

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const pick = (clientX: number, clientY: number) => {
    const w = toWorld(clientX, clientY)
    if (!w) return null
    let best: number | null = null
    let bestD = 22 / w.k
    for (const [n, c] of cars.current) {
      if (!c.seen) continue
      const d = Math.hypot(c.x - w.x, c.y - w.y)
      if (d < bestD) {
        bestD = d
        best = n
      }
    }
    return best
  }

  return (
    <div
      ref={wrap}
      className="tc"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, px: view.current.tPanX, py: view.current.tPanY, moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) {
          e.currentTarget.style.cursor = pick(e.clientX, e.clientY) != null ? 'pointer' : 'grab'
          return
        }
        const g = geo.current
        const r = e.currentTarget.getBoundingClientRect()
        if (!g) return
        const k = ((Math.min(r.width, r.height) * 0.86) / g.span) * view.current.zoom
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) {
          d.moved = true
          setFollow(false)
        }
        view.current.tPanX = d.px + (e.clientX - d.x) / k
        view.current.tPanY = d.py + (e.clientY - d.y) / k
        view.current.panX = view.current.tPanX
        view.current.panY = view.current.tPanY
        e.currentTarget.style.cursor = 'grabbing'
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved) {
          const hit = pick(e.clientX, e.clientY)
          onSelectDriver(hit)
          if (hit == null) setFollow(false)
        }
      }}
      onDoubleClick={fit}
    >
      <canvas ref={canvas} className="tc__canvas" aria-label="Race track map" role="img" />
      {conditions && (
        <div className="tc__cond mono">
          <span className={`tc__chip${conditions.night ? ' is-night' : ''}`}>
            {conditions.night ? '☾ NIGHT' : conditions.dusk ? '◐ DUSK' : '☀ DAY'} · {String(Math.floor(conditions.localHour)).padStart(2, '0')}:
            {String(Math.floor((conditions.localHour % 1) * 60)).padStart(2, '0')} LOCAL
          </span>
          <span className={`tc__chip${conditions.rain ? ' is-wet' : ''}`}>{conditions.rain ? '☂ WET' : 'DRY'}</span>
          {conditions.track != null && <span className="tc__chip">TRACK {conditions.track.toFixed(1)}°C</span>}
          {conditions.air != null && <span className="tc__chip">AIR {conditions.air.toFixed(1)}°C</span>}
          {conditions.flag && (
            <span className={`tc__chip is-flag-${conditions.flag}`}>
              {conditions.flag === 'red' ? 'RED FLAG' : conditions.flag === 'sc' ? 'SAFETY CAR' : 'VSC'}
            </span>
          )}
        </div>
      )}
      <div className="tc__hud">
        <div className="tc__group">
          <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
            −
          </button>
          <span className="mono">{zoomLabel}%</span>
          <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
            +
          </button>
        </div>
        <div className="tc__group">
          <button type="button" onClick={fit}>
            Fit
          </button>
          <button
            type="button"
            className={follow ? 'is-on' : ''}
            aria-pressed={follow}
            disabled={selected == null}
            title={selected == null ? 'Select a driver to follow' : 'Follow selected driver'}
            onClick={() => setFollow((f) => !f)}
          >
            Follow {selected != null ? names.get(selected) ?? `#${selected}` : ''}
          </button>
        </div>
      </div>
      <p className="tc__hint mono">SCROLL ZOOM · DRAG PAN · CLICK A HELMET · DOUBLE-CLICK FIT</p>
    </div>
  )
}

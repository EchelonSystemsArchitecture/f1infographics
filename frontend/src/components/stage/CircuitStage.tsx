import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import type { CircuitInfo } from '../../api/client'
import {
  buildTrackLayout,
  type MarkerPoint,
  type PxPoint,
  type LayoutCorner,
  type LayoutMarker,
  type TrackLayout,
} from '../../utils/circuitProjection'
import './CircuitStage.css'

const SPATIAL_TILT_DEG = 58
const PERSPECTIVE_PX = 1100
const HIT_RADIUS_PX = 26
const CORNER_LABEL_OFFSET = 7
const MARKER_R = 6

type Mode = 'SPATIAL' | 'BLUEPRINT'
type Camera = 'OVERVIEW' | 'FOLLOW' | 'SECTOR'

type CamParams = {
  tx: number
  ty: number
  tiltDeg: number
}

type FocusPin = {
  x: number
  y: number
  label: string
}

function useElementSize(): [RefObject<HTMLDivElement | null>, { w: number; h: number }] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size]
}

function projectPlaneToScreen(
  px: number,
  py: number,
  cam: CamParams,
  layout: TrackLayout,
  stageW: number,
  stageH: number,
): PxPoint {
  const dx = px - layout.width / 2
  const dy = py - layout.height / 2
  const tiltRad = (cam.tiltDeg * Math.PI) / 180
  const sinT = Math.sin(tiltRad)
  const cosT = Math.cos(tiltRad)
  const z = dy * sinT
  const f = PERSPECTIVE_PX / (PERSPECTIVE_PX - z)
  return {
    x: stageW / 2 + (cam.tx + dx) * f,
    y: stageH / 2 + (cam.ty + dy * cosT) * f,
  }
}

export function CircuitStage({
  circuit,
  markers,
  colours,
  selected,
  onSelectDriver,
}: {
  circuit: CircuitInfo | null
  markers: MarkerPoint[]
  colours: Map<number, string>
  selected: number | null
  onSelectDriver: (n: number | null) => void
}) {
  const [stageRef, size] = useElementSize()
  const [mode, setMode] = useState<Mode>('SPATIAL')
  const [camera, setCamera] = useState<Camera>('OVERVIEW')
  const [cursor, setCursor] = useState<PxPoint | null>(null)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)
  const [focusPinned, setFocusPinned] = useState<FocusPin | null>(null)
  const [pathLen, setPathLen] = useState<number | null>(null)
  const [drawn, setDrawn] = useState(false)
  const [motionArmed] = useState(
    () =>
      typeof window !== 'undefined' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [markersEntered, setMarkersEntered] = useState(false)
  const pathRef = useRef<SVGPathElement | null>(null)

  const circuitKey = circuit?.circuit_key ?? null
  const [prevCircuitKey, setPrevCircuitKey] = useState<number | null>(circuitKey)
  if (prevCircuitKey !== circuitKey) {
    setPrevCircuitKey(circuitKey)
    setDrawn(false)
    setMarkersEntered(false)
    setPathLen(null)
  }

  const layoutWidth = Math.max(size.w - 80, 280)
  const layoutHeight = Math.max(size.h - 60, 240)
  const layout = useMemo(
    () => (circuit ? buildTrackLayout(circuit, markers, layoutWidth, layoutHeight) : null),
    [circuit, markers, layoutWidth, layoutHeight],
  )

  useEffect(() => {
    if (!motionArmed || !layout?.d) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const len = pathRef.current?.getTotalLength() ?? 0
        setPathLen(len > 0 ? len : null)
        setDrawn(true)
        setMarkersEntered(true)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [circuitKey, layout?.d, motionArmed])

  const tilt = mode === 'SPATIAL' ? SPATIAL_TILT_DEG : 0
  const tiltRad = (tilt * Math.PI) / 180
  const activeCamera: Camera = selected == null && camera !== 'SECTOR' ? 'OVERVIEW' : camera

  const selLayout =
    layout && selected != null ? layout.markers.find((m) => m.driver_number === selected) ?? null : null

  const cam: CamParams =
    activeCamera === 'FOLLOW' && layout && selLayout
      ? {
          tx: layout.centerX - selLayout.x,
          ty: (layout.centerY - selLayout.y) * Math.cos(tiltRad),
          tiltDeg: tilt,
        }
      : { tx: 0, ty: 0, tiltDeg: tilt }

  const camRef = useRef<CamParams>(cam)
  useEffect(() => {
    camRef.current = cam
  })

  const stageW = size.w
  const stageH = size.h

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el || !layout || stageW === 0) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setCursor({ x: mx, y: my })

    let label: string | null = null
    for (const m of layout.markers) {
      const p = projectPlaneToScreen(m.x, m.y, camRef.current, layout, stageW, stageH)
      if (Math.hypot(p.x - mx, p.y - my) < HIT_RADIUS_PX) {
        label = `CAR ${m.driver_number}`
        break
      }
    }
    if (label == null) {
      for (const c of layout.corners) {
        const p = projectPlaneToScreen(c.x, c.y, camRef.current, layout, stageW, stageH)
        if (Math.hypot(p.x - mx, p.y - my) < HIT_RADIUS_PX) {
          label = c.dist != null ? `TURN ${c.number} · ${Math.round(c.dist)} m` : `TURN ${c.number}`
          break
        }
      }
    }
    setHoverLabel(label)
  }

  const handleMouseLeave = () => {
    setCursor(null)
    setHoverLabel(null)
  }

  const crosshair = focusPinned ?? cursor
  const hudLabel = focusPinned?.label ?? hoverLabel ?? '—'

  const svgContent = useMemo(() => {
    if (!layout) return null
    const handleMarkerClick = (m: LayoutMarker, ev: MouseEvent | ReactKeyboardEvent) => {
      ev.stopPropagation()
      onSelectDriver(selected === m.driver_number ? null : m.driver_number)
    }
    return (
      <svg
        key={circuit?.circuit_key ?? 'none'}
        className="cs__svg"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        <path className="cs__bed" d={layout.d} />
        <path
          ref={pathRef}
          className={`cs__line${drawn ? ' cs__line--drawn' : ''}`}
          d={layout.d}
          style={
            pathLen != null
              ? ({ '--gt-path-len': `${pathLen}` } as CSSProperties)
              : undefined
          }
        />
        <line
          className="cs__sf"
          x1={layout.sf.x1}
          y1={layout.sf.y1}
          x2={layout.sf.x2}
          y2={layout.sf.y2}
        />
        {layout.corners.map((c: LayoutCorner) => (
          <g key={`c${c.number}`}>
            <circle className="cs__corner-dot" cx={c.x} cy={c.y} r={2} />
            <text
              className="cs__corner-label"
              x={c.x + (c.x >= layout.centerX ? CORNER_LABEL_OFFSET : -CORNER_LABEL_OFFSET)}
              y={c.y + (c.y >= layout.centerY ? CORNER_LABEL_OFFSET : -CORNER_LABEL_OFFSET)}
            >
              {c.number}
            </text>
          </g>
        ))}
        {layout.markers.map((m, i) => (
          <g
            key={m.driver_number}
            className={`cs__marker${selected === m.driver_number ? ' cs__marker--sel' : ''}${m.interpolated ? ' cs__marker--interp' : ''}${markersEntered ? ' cs__marker--enter' : ''}`}
            style={{ '--i': i } as CSSProperties}
            tabIndex={0}
            role="button"
            aria-label={`Select car ${m.driver_number}`}
            onClick={(ev) => handleMarkerClick(m, ev)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                handleMarkerClick(m, ev)
              }
            }}
            onFocus={() => {
              const p = projectPlaneToScreen(m.x, m.y, camRef.current, layout, stageW, stageH)
              setFocusPinned({ x: p.x, y: p.y, label: `CAR ${m.driver_number}` })
            }}
            onBlur={() => setFocusPinned(null)}
          >
            <title>{`Car ${m.driver_number}`}</title>
            {selected === m.driver_number && (
              <circle className="cs__sel-ring" cx={m.x} cy={m.y} r={MARKER_R + 14} />
            )}
            <g className="cs__helmet" transform={`translate(${m.x} ${m.y}) scale(1.7)`} style={{ ['--team' as string]: colours.get(m.driver_number) ?? '#9a948b' } as CSSProperties}>
              <ellipse className="cs__helmet-shadow" cx="0" cy="7.6" rx="9.5" ry="1.8" />
              <path
                className="cs__helmet-shell"
                d="M-9.6 5.6 L-9.6 1.2 C-9.6 -5.4 -4.4 -9.6 1.4 -9.6 C6.6 -9.6 10.4 -5.6 10.4 -0.4 C10.4 2.6 9.4 4.6 8 5.6 Z"
              />
              <path className="cs__helmet-base" d="M-9.6 5.6 L8 5.6 L7.2 7 L-9.6 7 Z" />
              <path
                className="cs__helmet-visor"
                d="M-9.6 -1.4 L-6 -6 L1.8 -5.2 C3.8 -5 4.4 -2.4 3 -1 L0.6 1.8 L-9.6 2.6 Z"
              />
              <path className="cs__helmet-stripe" d="M5.2 -7 C8.2 -5.6 9.2 -2.6 8.6 1.2" />
              <text className="cs__helmet-num" x="-3.2" y="0.9">
                {m.driver_number}
              </text>
            </g>
          </g>
        ))}
      </svg>
    )
  }, [layout, circuit, selected, colours, onSelectDriver, stageW, stageH, drawn, markersEntered, pathLen])

  return (
    <div
      className={`cs cs--${mode.toLowerCase()}${motionArmed ? ' cs--animate' : ''}`}
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelectDriver(null)}
    >
      <div className="cs__viewport">
        <div
          className="cs__plane"
          style={{ transform: `translate(${cam.tx}px, ${cam.ty}px) rotateX(${tilt}deg)` }}
        >
          {svgContent}
        </div>
      </div>

      {crosshair && (
        <div className="cs__crosshair" style={{ left: crosshair.x, top: crosshair.y }}>
          <span className={`cs__arm cs__arm--n${focusPinned ? ' cs__arm--armed' : ''}`} />
          <span className={`cs__arm cs__arm--s${focusPinned ? ' cs__arm--armed' : ''}`} />
          <span className={`cs__arm cs__arm--w${focusPinned ? ' cs__arm--armed' : ''}`} />
          <span className={`cs__arm cs__arm--e${focusPinned ? ' cs__arm--armed' : ''}`} />
          <span className={`cs__core${focusPinned ? ' cs__core--armed' : ''}`} />
        </div>
      )}

      {!layout && <div className="cs__empty mono">CIRCUIT MAP UNAVAILABLE</div>}

      <div className="cs__hud" onClick={(ev) => ev.stopPropagation()}>
        <div className="cs__controls">
          <div className="cs__group" role="group" aria-label="Stage mode">
            <button
              type="button"
              className={`cs__btn${mode === 'SPATIAL' ? ' cs__btn--on' : ''}`}
              aria-pressed={mode === 'SPATIAL'}
              onClick={() => setMode('SPATIAL')}
            >
              SPATIAL
            </button>
            <button
              type="button"
              className={`cs__btn${mode === 'BLUEPRINT' ? ' cs__btn--on' : ''}`}
              aria-pressed={mode === 'BLUEPRINT'}
              onClick={() => setMode('BLUEPRINT')}
            >
              BLUEPRINT
            </button>
          </div>
          <div className="cs__group" role="group" aria-label="Camera preset">
            <button
              type="button"
              className={`cs__btn${activeCamera === 'OVERVIEW' ? ' cs__btn--on' : ''}`}
              aria-pressed={activeCamera === 'OVERVIEW'}
              onClick={() => setCamera('OVERVIEW')}
            >
              OVERVIEW
            </button>
            <button
              type="button"
              className={`cs__btn${activeCamera === 'FOLLOW' ? ' cs__btn--on' : ''}`}
              aria-pressed={activeCamera === 'FOLLOW'}
              aria-disabled={!selected}
              title={selected == null ? 'SELECT A CAR TO FOLLOW' : undefined}
              onClick={() => {
                if (selected != null) setCamera('FOLLOW')
              }}
            >
              FOLLOW
            </button>
            <button
              type="button"
              className="cs__btn"
              aria-pressed={false}
              aria-disabled
              title="SECTOR GEOMETRY UNAVAILABLE"
            >
              SECTOR
            </button>
          </div>
        </div>
        <div className="cs__hud-label mono" aria-live="polite">
          {hudLabel}
        </div>
      </div>
    </div>
  )
}

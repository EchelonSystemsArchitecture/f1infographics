import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { TimingRow } from '../../api/client'
import { formatCompound, formatLapMs } from '../../utils/format'
import './TimingTower.css'

export function TimingTower({
  rows,
  colours,
  teams,
  markerMode,
  selected = null,
  onSelectDriver,
}: {
  rows: TimingRow[]
  colours: Map<number, string>
  teams?: Map<number, string>
  markerMode?: string
  selected?: number | null
  onSelectDriver?: (n: number | null) => void
}) {
  const rowsElRef = useRef<HTMLDivElement | null>(null)
  const topsRef = useRef(new Map<number, number>())
  const positionsRef = useRef(new Map<number, number>())
  const animsRef = useRef(new Map<number, Animation>())
  const [lapBook, setLapBook] = useState<Map<number, { best: number; seen: number }>>(new Map())

  const sessionBest = rows.reduce<number | null>(
    (min, r) =>
      r.last_lap_ms != null && (min === null || r.last_lap_ms < min) ? r.last_lap_ms : min,
    null,
  )

  useLayoutEffect(() => {
    for (const anim of animsRef.current.values()) anim.cancel()
    animsRef.current.clear()

    const container = rowsElRef.current
    if (!container) {
      topsRef.current.clear()
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const containerTop = container.getBoundingClientRect().top
    const scrollTop = container.scrollTop
    const measured = Array.from(container.querySelectorAll<HTMLElement>('.tower__row')).map(
      (el) => ({
        el,
        driver: Number(el.dataset.driver),
        position: Number(el.dataset.position),
        top: el.getBoundingClientRect().top - containerTop + scrollTop,
      }),
    )

    const previousTops = topsRef.current
    if (!reduced) {
      for (const m of measured) {
        if (typeof m.el.animate !== 'function') continue
        const prevTop = previousTops.get(m.driver)
        if (prevTop === undefined) continue
        const delta = prevTop - m.top
        if (Math.abs(delta) < 0.5) continue
        const anim = m.el.animate(
          [
            { transform: `translateY(${delta}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
        )
        animsRef.current.set(m.driver, anim)
      }
    }

    const tintByDriver = new Map<number, { r: number; g: number; b: number } | null>()
    for (const row of rows) {
      tintByDriver.set(
        row.driver_number,
        parseHexRgb(colours.get(row.driver_number) ?? row.team_colour),
      )
    }

    const nextTops = new Map<number, number>()
    for (const m of measured) {
      nextTops.set(m.driver, m.top)

      const previousPosition = positionsRef.current.get(m.driver)
      positionsRef.current.set(m.driver, m.position)
      if (reduced || previousPosition === undefined) continue
      if (!Number.isFinite(m.position) || m.position >= previousPosition) continue
      if (typeof m.el.animate !== 'function') continue
      const tint = tintByDriver.get(m.driver)
      if (!tint) continue
      const cell = m.el.querySelector<HTMLElement>('.tower__pos')
      cell?.animate(
        [
          { backgroundColor: `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.34)` },
          { backgroundColor: `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0)` },
        ],
        { duration: 560, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      )
    }

    topsRef.current = nextTops

    setLapBook((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const row of rows) {
        if (row.last_lap_ms == null) continue
        const entry = next.get(row.driver_number)
        if (!entry) {
          next.set(row.driver_number, { best: row.last_lap_ms, seen: 1 })
          changed = true
          continue
        }
        const best = row.last_lap_ms < entry.best ? row.last_lap_ms : entry.best
        const seen = entry.seen < 2 ? entry.seen + 1 : entry.seen
        if (best !== entry.best || seen !== entry.seen) {
          next.set(row.driver_number, { best, seen })
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [rows, colours])

  return (
    <section className="tower" aria-label="Timing tower">
      <header className="tower__header">
        <span className="tower__col tower__col--pos">Pos</span>
        <span className="tower__col tower__col--drv">Driver</span>
        <span className="tower__col tower__col--team">Team</span>
        <span className="tower__col tower__col--int">Int</span>
        <span className="tower__col tower__col--gap">Gap</span>
        <span className="tower__col tower__col--last">Last</span>
        <span className="tower__col tower__col--tyre">Tyre</span>
      </header>
      {rows.length === 0 ? (
        <div className="tower__empty mono">NO TIMING DATA</div>
      ) : (
        <div className="tower__rows" ref={rowsElRef}>
          {rows.map((row, i) => {
            const isSelected = selected === row.driver_number
            return (
              <div
                key={row.driver_number}
                data-driver={row.driver_number}
                data-position={row.position}
                className={`tower__row${isSelected ? ' tower__row--selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-selected={isSelected}
                aria-label={`${row.name_acronym} position ${row.position}`}
                style={{ '--i': i } as CSSProperties}
                onClick={() => onSelectDriver?.(isSelected ? null : row.driver_number)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectDriver?.(isSelected ? null : row.driver_number)
                  }
                }}
              >
                <span className="tower__col tower__col--pos tower__pos mono">{row.position}</span>
                <span className="tower__col tower__col--drv">
                  <span
                    className="tower__colour-bar"
                    style={{
                      background: colours.get(row.driver_number) ?? row.team_colour,
                    }}
                  />
                  <span className="tower__acronym mono">{row.name_acronym}</span>
                </span>
                <span className="tower__col tower__col--team">
                  <span className="tower__team-name">{teams?.get(row.driver_number) ?? '—'}</span>
                </span>
                <span
                  className={`tower__col tower__col--int mono${row.interval == null ? ' tower__is-null' : ''}`}
                >
                  {row.interval ?? '—'}
                </span>
                <span
                  className={`tower__col tower__col--gap mono${row.gap_to_leader == null ? ' tower__is-null' : ''}`}
                >
                  {row.gap_to_leader ?? '—'}
                </span>
                <span
                  className={`tower__col tower__col--last mono ${lastLapClass(row, sessionBest, lapBook)}`}
                >
                  {formatLapMs(row.last_lap_ms)}
                </span>
                <span className="tower__col tower__col--tyre mono">
                  <span className={`tower__tyre tower__tyre--${compoundKey(row.compound)}`}>
                    {formatCompound(row.compound)}
                  </span>
                  {row.tyre_age != null && (
                    <span className="tower__tyre-age">{row.tyre_age}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {markerMode && markerMode !== 'REPLAY' && (
        <div className="tower__marker-mode">
          <span className={`badge badge-${markerMode.toLowerCase()}`}>{markerMode}</span>
          <span className="tower__marker-note">marker mode</span>
        </div>
      )}
    </section>
  )
}

function lastLapClass(
  row: TimingRow,
  sessionBest: number | null,
  lapBook: Map<number, { best: number; seen: number }>,
): string {
  if (row.last_lap_ms == null) return 'tower__last tower__last--none'
  if (sessionBest !== null && row.last_lap_ms === sessionBest) {
    return 'tower__last tower__last--best'
  }
  const entry = lapBook.get(row.driver_number)
  if (entry && entry.seen >= 2 && row.last_lap_ms <= entry.best) {
    return 'tower__last tower__last--pb'
  }
  return 'tower__last tower__last--sb'
}

function compoundKey(c: string | null): string {
  if (!c) return 'none'
  const k = c.toUpperCase()
  if (k === 'SOFT') return 's'
  if (k === 'MEDIUM') return 'm'
  if (k === 'HARD') return 'h'
  if (k === 'INTERMEDIATE') return 'i'
  if (k === 'WET') return 'w'
  return 'none'
}

function parseHexRgb(hex: string | undefined | null): { r: number; g: number; b: number } | null {
  if (!hex) return null
  const raw = hex.trim().replace(/^#/, '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  const value = Number.parseInt(full, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

import { Fragment } from 'react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { api, type DriverInfo, type TelemetryCompare, type TelemetryLap } from '../../api/client'
import { FLAGSHIP_SESSION_KEY } from '../../data/flagship'
import { useCircuit, useDriverColour } from '../../hooks/useFlagship'
import { cumulativeDelta } from '../../utils/delta'
import { formatLapMs } from '../../utils/format'
import './BattleLab.css'

const PAD_L = 56
const PAD_R = 18
const PLOT_TOP = 10
const DELTA_BOTTOM = 140
const AXIS_RULE_Y = 144
const TICK_Y = 162
const SECTOR_LABEL_Y = 176
const DELTA_HEIGHT = 180
const SPEED_H = 150
const PCT_H = 96

export function BattleLab({
  drivers,
  sessionKey = FLAGSHIP_SESSION_KEY,
}: {
  drivers?: DriverInfo[]
  sessionKey?: number
}) {
  const list = drivers ?? []
  const sorted = [...list].sort((x, y) => x.driver_number - y.driver_number)
  const colours = useDriverColour(list)
  const circuit = useCircuit(sessionKey)

  const [a, setA] = useState<number | null>(() => sorted[0]?.driver_number ?? null)
  const [b, setB] = useState<number | null>(() => sorted[1]?.driver_number ?? null)
  const [lapRaw, setLapRaw] = useState('')
  const [data, setData] = useState<TelemetryCompare | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [chartsRef, w] = useElementWidth()

  useEffect(() => {
    setA(sorted[0]?.driver_number ?? null)
    setB(sorted[1]?.driver_number ?? null)
    setData(null)
    setError(null)
    setSettledKey(null)
    // Driver identity is derived from the selected session, not the previous one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey])

  const trim = lapRaw.trim()
  const lapValid = trim === '' || /^[1-9]\d{0,1}$/.test(trim)
  const lapQuery = trim === '' ? 'best' : trim
  const requestKey = a != null && b != null && lapValid ? `${a}|${b}|${lapQuery}` : null
  const busy = requestKey != null && settledKey !== requestKey

  useEffect(() => {
    if (requestKey == null || a == null || b == null) return
    let cancelled = false
    api
      .telemetry(sessionKey, [a, b], lapQuery)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setData(null)
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [requestKey, a, b, lapQuery, sessionKey])

  const corners = useMemo(() => {
    const out: { number: number; dist: number }[] = []
    for (const c of circuit?.corners ?? []) {
      if (c.dist != null) out.push({ number: c.number, dist: c.dist })
    }
    return out
  }, [circuit])

  const lapA =
    a != null ? (data?.drivers.find((d) => d.driver_number === a)?.laps[0] ?? null) : null
  const lapB =
    b != null ? (data?.drivers.find((d) => d.driver_number === b)?.laps[0] ?? null) : null
  const lengthM = data?.length_m ?? 0
  const boundaries = lapA?.sd ?? lapB?.sd ?? []
  const delta = lapA && lapB ? cumulativeDelta(lapA.speed, lapB.speed, lengthM) : []
  const clockDelta = lapA && lapB ? lapA.duration - lapB.duration : null
  const integratedDelta = delta.length > 0 ? delta[delta.length - 1] : null

  const infoA = a != null ? (sorted.find((d) => d.driver_number === a) ?? null) : null
  const infoB = b != null ? (sorted.find((d) => d.driver_number === b) ?? null) : null
  const acrA = infoA?.name_acronym ?? '—'
  const acrB = infoB?.name_acronym ?? '—'
  const colourA = 'var(--team-primary, #ff8000)'
  const colourB = 'var(--team-secondary, #3fc5ff)'
  void colours

  function changeA(v: number) {
    if (v === b) {
      setA(v)
      setB(a)
    } else {
      setA(v)
    }
  }
  function changeB(v: number) {
    if (v === a) {
      setB(v)
      setA(b)
    } else {
      setB(v)
    }
  }
  function swap() {
    setA(b)
    setB(a)
  }

  const chartsReady =
    w > PAD_L + PAD_R &&
    data != null &&
    lapA != null &&
    lapB != null &&
    lengthM > 0 &&
    delta.length > 0

  let dLo = 0
  let dHi = 0
  for (const v of delta) {
    if (v < dLo) dLo = v
    if (v > dHi) dHi = v
  }
  const dSpan = dHi - dLo
  const dPad = dSpan > 0 ? dSpan * 0.12 : 0.5
  const domLo = Math.min(0, dLo) - dPad
  const domHi = Math.max(0, dHi) + dPad

  const speedA = lapA?.speed ?? []
  const speedB = lapB?.speed ?? []
  const thrA = lapA?.throttle ?? []
  const thrB = lapB?.throttle ?? []
  const brkA = lapA?.brake ?? []
  const brkB = lapB?.brake ?? []
  const speedMax = channelMax(speedA, speedB, 'speed')
  const thrMax = channelMax(thrA, thrB, 'pct')
  const brkMax = channelMax(brkA, brkB, 'pct')

  const edges = [0, ...boundaries, lengthM]
  const sectorRows = edges.slice(0, -1).map((from, i) => ({ from, to: edges[i + 1], index: i }))

  return (
    <div className="bl">
      <div className="bl__controls">
        <label className="bl__field">
          <span className="bl__field-label mono">DRIVER A</span>
          <select
            className="bl__select"
            value={a ?? ''}
            onChange={(e) => changeA(Number(e.target.value))}
          >
            <option value="" disabled hidden>
              —
            </option>
            {sorted.map((d) => (
              <option key={d.driver_number} value={d.driver_number}>
                {d.driver_number} · {d.name_acronym}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="bl__swap mono" onClick={swap} aria-label="Swap drivers">
          ⇄ SWAP
        </button>
        <label className="bl__field">
          <span className="bl__field-label mono">DRIVER B</span>
          <select
            className="bl__select"
            value={b ?? ''}
            onChange={(e) => changeB(Number(e.target.value))}
          >
            <option value="" disabled hidden>
              —
            </option>
            {sorted.map((d) => (
              <option key={d.driver_number} value={d.driver_number}>
                {d.driver_number} · {d.name_acronym}
              </option>
            ))}
          </select>
        </label>
        <label className="bl__field">
          <span className="bl__field-label mono">LAP</span>
          <input
            className="bl__input"
            type="text"
            inputMode="numeric"
            value={lapRaw}
            placeholder="BEST"
            aria-invalid={!lapValid}
            onChange={(e) => setLapRaw(e.target.value)}
          />
        </label>
        {!lapValid && (
          <span className="bl__hint mono">LAP MUST BE 1–99 OR EMPTY FOR BEST LAP</span>
        )}
      </div>

      <div className="bl__summary">
        <DriverChip tag="A" info={infoA} lap={lapA} colour={colourA} />
        <div className="bl__deltas">
          <div className="bl__readout">
            <span className="bl__readout-label mono">Δ CLOCK (A−B)</span>
            <span className="bl__readout-value mono">
              {clockDelta == null ? '—' : formatSigned(clockDelta)}
            </span>
          </div>
          <div className="bl__readout">
            <span className="bl__readout-label mono">Δ INTEGRATED (A−B)</span>
            <span className="bl__readout-value mono">
              {integratedDelta == null ? '—' : formatSigned(integratedDelta)}
            </span>
          </div>
          <span className="badge badge-replay">REPLAY</span>
        </div>
        <DriverChip tag="B" info={infoB} lap={lapB} colour={colourB} />
      </div>

      <div className="bl__grid">
        <div className="bl__main">
          {sorted.length < 2 && (
            <div className="bl__empty mono">INSUFFICIENT DRIVERS FOR COMPARISON</div>
          )}
          {error != null && !busy && (
            <div className="bl__status bl__status--error mono" role="alert">
              {error.includes('-> 404')
                ? 'NO TELEMETRY FOR SELECTION · 404'
                : `TELEMETRY UNAVAILABLE · ${error}`}
            </div>
          )}
          {busy && data == null && <div className="bl__status mono">LOADING TELEMETRY…</div>}
          <div
            className={`bl__charts${busy && data ? ' bl__charts--busy' : ''}`}
            ref={chartsRef}
          >
            {chartsReady && lapA && lapB && (
              <>
                <ChannelChart
                  title="SPEED"
                  unit="km/h"
                  label={`Speed comparison, ${acrA} versus ${acrB}`}
                  acrA={acrA}
                  acrB={acrB}
                  colourA={colourA}
                  colourB={colourB}
                  valuesA={speedA}
                  valuesB={speedB}
                  width={w}
                  height={SPEED_H}
                  max={speedMax}
                  sectors={boundaries}
                  lengthM={lengthM}
                  corners={corners}
                />
                <ChannelChart
                  title="THROTTLE"
                  unit="%"
                  label={`Throttle comparison, ${acrA} versus ${acrB}`}
                  acrA={acrA}
                  acrB={acrB}
                  colourA={colourA}
                  colourB={colourB}
                  valuesA={thrA}
                  valuesB={thrB}
                  width={w}
                  height={PCT_H}
                  max={thrMax}
                  sectors={boundaries}
                  lengthM={lengthM}
                />
                <ChannelChart
                  title="BRAKE"
                  unit="%"
                  label={`Brake comparison, ${acrA} versus ${acrB}`}
                  acrA={acrA}
                  acrB={acrB}
                  colourA={colourA}
                  colourB={colourB}
                  valuesA={brkA}
                  valuesB={brkB}
                  width={w}
                  height={PCT_H}
                  max={brkMax}
                  sectors={boundaries}
                  lengthM={lengthM}
                />
                <DeltaChart
                  width={w}
                  acrA={acrA}
                  acrB={acrB}
                  delta={delta}
                  domLo={domLo}
                  domHi={domHi}
                  boundaries={boundaries}
                  lengthM={lengthM}
                />
              </>
            )}
          </div>
        </div>

        <aside className="bl__rail">
          <header className="bl__rail-header mono">SECTOR DELTAS</header>
          {lapA && lapB ? (() => {
            const maxSector = Math.max(0.05, ...sectorRows.map((row) => { const va = lapA.sectors[row.index]; const vb = lapB.sectors[row.index]; return va != null && vb != null ? Math.abs(va - vb) : 0 }))
            return (
            <table className="bl__table" aria-label="Sector deltas">
              <thead>
                <tr>
                  <th>SECTOR</th>
                  <th>{acrA}</th>
                  <th>{acrB}</th>
                  <th>Δ A−B</th>
                </tr>
                <tr className="bl__legend-row">
                  <th colSpan={4}>
                    <span className="bl__leg bl__leg--a">{acrA} faster ◀</span>
                    <span className="bl__leg bl__leg--b">▶ {acrB} faster</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectorRows.map((row) => {
                  const va = lapA.sectors[row.index] ?? null
                  const vb = lapB.sectors[row.index] ?? null
                  const d = va != null && vb != null ? va - vb : null
                  return (
                    <Fragment key={row.index}>
                    <tr>
                      <td>S{row.index + 1}</td>
                      <td>{va == null ? '—' : formatLapMs(va * 1000)}</td>
                      <td>{vb == null ? '—' : formatLapMs(vb * 1000)}</td>
                      <td className={d == null ? undefined : deltaClass(d)}>
                        {d == null ? '—' : formatSigned(d)}
                      </td>
                    </tr>
                    {d != null && (
                      <tr className="bl__bar-row">
                        <td colSpan={4}>
                          <span className="bl__bar">
                            <i
                              className={d < 0 ? 'bl__bar-a' : 'bl__bar-b'}
                              style={{ width: `${Math.min(50, (Math.abs(d) / maxSector) * 50)}%` }}
                            />
                          </span>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  )
                })}
                <tr className="bl__table-total">
                  <td>LAP</td>
                  <td>{formatLapMs(lapA.duration * 1000)}</td>
                  <td>{formatLapMs(lapB.duration * 1000)}</td>
                  <td className={deltaClass(lapA.duration - lapB.duration)}>
                    {formatSigned(lapA.duration - lapB.duration)}
                  </td>
                </tr>
              </tbody>
            </table>
            )
          })() : (
            <div className="bl__empty mono">AWAITING TELEMETRY</div>
          )}
          <p className="bl__note">
            SECTOR AND LAP Δ FROM OFFICIAL TIMING. Δt CURVE INTEGRATED FROM 180-POINT BINNED
            SPEED (Σ (1/v_A − 1/v_B)·ds). REPLAY DATA.
          </p>
        </aside>
      </div>
    </div>
  )
}

function DriverChip({
  tag,
  info,
  lap,
  colour,
}: {
  tag: string
  info: DriverInfo | null
  lap: TelemetryLap | null
  colour: string | undefined
}) {
  return (
    <div className="bl__chip">
      <span className="bl__chip-tag mono">{tag}</span>
      <span className="bl__chip-swatch" style={colour ? { background: colour } : undefined} />
      <span className="bl__chip-id mono">#{info?.driver_number ?? '—'}</span>
      <span className="bl__chip-acr mono">{info?.name_acronym ?? '—'}</span>
      <span className="bl__chip-team">{info?.team_name ?? '—'}</span>
      <span className="bl__chip-lap mono">LAP {lap?.lap_number ?? '—'}</span>
      <span className="bl__chip-time mono">
        {lap ? formatLapMs(lap.duration * 1000) : '—'}
      </span>
      {lap?.is_pit_out_lap && <span className="bl__chip-flag mono">PIT-OUT</span>}
    </div>
  )
}

function ChannelChart({
  title,
  unit,
  label,
  acrA,
  acrB,
  colourA,
  colourB,
  valuesA,
  valuesB,
  width,
  height,
  max,
  sectors,
  lengthM,
  corners,
}: {
  title: string
  unit: string
  label: string
  acrA: string
  acrB: string
  colourA?: string
  colourB?: string
  valuesA: readonly (number | null)[]
  valuesB: readonly (number | null)[]
  width: number
  height: number
  max: number
  sectors: number[]
  lengthM: number
  corners?: { number: number; dist: number }[]
}) {
  const ticks = [0, max / 2, max]
  const pathA = seriesPath(valuesA, width, max, PLOT_TOP, height)
  const pathB = seriesPath(valuesB, width, max, PLOT_TOP, height)
  return (
    <section className="bl__chart">
      <header className="bl__chart-head">
        <span className="bl__chart-title">{title}</span>
        <span className="bl__legend">
          <span className="bl__legend-item">
            <span
              className="bl__legend-bar"
              style={colourA ? { borderTopColor: colourA } : undefined}
            />
            <span className="mono">{acrA}</span>
          </span>
          <span className="bl__legend-item">
            <span
              className="bl__legend-bar bl__legend-bar--b"
              style={colourB ? { borderTopColor: colourB } : undefined}
            />
            <span className="mono">{acrB}</span>
          </span>
        </span>
        <span className="bl__chart-unit mono">{unit}</span>
      </header>
      <svg
        className="bl__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      >
        {ticks.map((tv) => {
          const y = yAt(tv, max, PLOT_TOP, height)
          const labelY = Math.min(y + 3, height - 4)
          return (
            <g key={tv}>
              <line className="bl__gridline" x1={PAD_L} x2={width - PAD_R} y1={y} y2={y} />
              <text className="bl__axis-label" x={PAD_L - 8} y={labelY}>
                {Math.round(tv)}
              </text>
            </g>
          )
        })}
        {sectors.map((m) => {
          const x = xAt(m, width, lengthM)
          return (
            <line
              key={m}
              className="bl__sector-line"
              x1={x}
              x2={x}
              y1={PLOT_TOP}
              y2={height}
            />
          )
        })}
        {(corners ?? []).map((c, i) => {
          const x = xAt(c.dist, width, lengthM)
          return (
            <g key={c.number}>
              <line className="bl__corner-line" x1={x} x2={x} y1={PLOT_TOP} y2={height} />
              <text className="bl__corner-num" x={x} y={12 + (i % 2) * 12}>
                {c.number}
              </text>
            </g>
          )
        })}
        <path
          className="bl__series"
          d={pathA}
          style={colourA ? { stroke: colourA } : undefined}
        />
        <path
          className="bl__series bl__series--b"
          d={pathB}
          style={colourB ? { stroke: colourB } : undefined}
        />
      </svg>
    </section>
  )
}

function DeltaChart({
  width,
  acrA,
  acrB,
  delta,
  domLo,
  domHi,
  boundaries,
  lengthM,
}: {
  width: number
  acrA: string
  acrB: string
  delta: number[]
  domLo: number
  domHi: number
  boundaries: number[]
  lengthM: number
}) {
  const line = deltaPath(delta, width, domHi, domLo)
  const area = deltaAreaPath(delta, width, domHi, domLo)
  const yZero = deltaY(0, domHi, domLo)
  const gridVals = [domHi, 0, domLo]
  const edges = [0, ...boundaries, lengthM]
  const mileTicks: number[] = []
  for (let m = 0; m <= lengthM; m += 1000) mileTicks.push(m)
  return (
    <section className="bl__chart">
      <header className="bl__chart-head">
        <span className="bl__chart-title">Δt (A−B)</span>
        <span className="bl__chart-unit mono">s</span>
      </header>
      <svg
        className="bl__svg"
        width={width}
        height={DELTA_HEIGHT}
        viewBox={`0 0 ${width} ${DELTA_HEIGHT}`}
        role="img"
        aria-label={`Integrated delta time, ${acrA} versus ${acrB}`}
      >
        {gridVals.map((gv) => {
          const y = deltaY(gv, domHi, domLo)
          const labelY = Math.min(y + 3, DELTA_HEIGHT - 4)
          return (
            <g key={gv}>
              <line
                className="bl__gridline"
                x1={PAD_L}
                x2={width - PAD_R}
                y1={y}
                y2={y}
              />
              <text className="bl__axis-label" x={PAD_L - 8} y={labelY}>
                {formatSigned(gv)}
              </text>
            </g>
          )
        })}
        <line
          className="bl__zero"
          x1={PAD_L}
          x2={width - PAD_R}
          y1={yZero}
          y2={yZero}
        />
        {boundaries.map((m) => {
          const x = xAt(m, width, lengthM)
          return (
            <line
              key={m}
              className="bl__sector-line"
              x1={x}
              x2={x}
              y1={PLOT_TOP}
              y2={DELTA_BOTTOM}
            />
          )
        })}
        <defs>
          <clipPath id="bl-above">
            <rect x={0} y={0} width={width} height={Math.max(0, yZero)} />
          </clipPath>
          <clipPath id="bl-below">
            <rect x={0} y={yZero} width={width} height={Math.max(0, DELTA_BOTTOM - yZero + 40)} />
          </clipPath>
        </defs>
        <path className="bl__delta-area bl__delta-area--b" d={area} clipPath="url(#bl-above)" />
        <path className="bl__delta-area bl__delta-area--a" d={area} clipPath="url(#bl-below)" />
        <path className="bl__delta-line" d={line} />
        <line
          className="bl__axis-rule"
          x1={PAD_L}
          x2={width - PAD_R}
          y1={AXIS_RULE_Y}
          y2={AXIS_RULE_Y}
        />
        {mileTicks.map((m) => {
          const x = xAt(m, width, lengthM)
          const showLabel = x > PAD_L + 44 && x < width - PAD_R - 44
          return (
            <g key={m}>
              <line
                className="bl__tick"
                x1={x}
                x2={x}
                y1={AXIS_RULE_Y}
                y2={AXIS_RULE_Y + 6}
              />
              {showLabel && (
                <text className="bl__tick-label" x={x} y={TICK_Y}>
                  {m}
                </text>
              )}
            </g>
          )
        })}
        <line
          className="bl__tick"
          x1={width - PAD_R}
          x2={width - PAD_R}
          y1={AXIS_RULE_Y}
          y2={AXIS_RULE_Y + 6}
        />
        <text className="bl__axis-caption" x={PAD_L} y={TICK_Y}>
          DIST (m)
        </text>
        <text
          className="bl__axis-caption"
          x={width - PAD_R}
          y={TICK_Y}
          textAnchor="end"
        >
          FINISH
        </text>
        {edges.slice(0, -1).map((from, i) => {
          const to = edges[i + 1]
          const cx = (xAt(from, width, lengthM) + xAt(to, width, lengthM)) / 2
          return (
            <text
              key={i}
              className="bl__sector-label"
              x={cx}
              y={SECTOR_LABEL_Y}
            >{`S${i + 1}`}</text>
          )
        })}
      </svg>
    </section>
  )
}

function useElementWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function xAt(m: number, width: number, lengthM: number): number {
  if (!(lengthM > 0)) return PAD_L
  const plotW = width - PAD_L - PAD_R
  return PAD_L + (m / lengthM) * plotW
}

function yAt(v: number, max: number, top: number, h: number): number {
  const plotH = h - top
  return top + (1 - v / max) * plotH
}

function deltaY(v: number, hi: number, lo: number): number {
  const span = hi - lo
  if (!(span > 0)) return (PLOT_TOP + DELTA_BOTTOM) / 2
  return PLOT_TOP + ((hi - v) / span) * (DELTA_BOTTOM - PLOT_TOP)
}

function seriesPath(
  values: readonly (number | null)[],
  width: number,
  max: number,
  top: number,
  h: number,
): string {
  const n = values.length
  if (n === 0) return ''
  const plotW = width - PAD_L - PAD_R
  let d = ''
  let pen = false
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null || !Number.isFinite(v)) {
      pen = false
      continue
    }
    const x = PAD_L + ((i + 0.5) / n) * plotW
    const y = yAt(v, max, top, h)
    d += `${pen ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
    pen = true
  }
  return d
}

function deltaPath(
  values: readonly number[],
  width: number,
  hi: number,
  lo: number,
): string {
  const n = values.length
  if (n === 0) return ''
  const plotW = width - PAD_L - PAD_R
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = PAD_L + ((i + 0.5) / n) * plotW
    const y = deltaY(values[i], hi, lo)
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d
}

function deltaAreaPath(
  values: readonly number[],
  width: number,
  hi: number,
  lo: number,
): string {
  const n = values.length
  if (n === 0) return ''
  const plotW = width - PAD_L - PAD_R
  const yZero = deltaY(0, hi, lo)
  const xStart = PAD_L + (0.5 / n) * plotW
  const xEnd = PAD_L + ((n - 0.5) / n) * plotW
  let d = deltaPath(values, width, hi, lo)
  d += `L${xEnd.toFixed(2)} ${yZero.toFixed(2)}L${xStart.toFixed(2)} ${yZero.toFixed(2)}Z`
  return d
}

function channelMax(
  a: readonly (number | null)[],
  b: readonly (number | null)[],
  kind: 'speed' | 'pct',
): number {
  let m = 0
  for (const arr of [a, b]) {
    for (const v of arr) {
      if (v != null && Number.isFinite(v) && v > m) m = v
    }
  }
  if (kind === 'speed') return Math.max(200, Math.ceil(m / 20) * 20)
  return Math.max(100, Math.ceil(m / 10) * 10)
}

function formatSigned(v: number, dp = 3): string {
  if (!Number.isFinite(v)) return '—'
  const r = Number(v.toFixed(dp))
  if (r === 0) return `+${(0).toFixed(dp)}`
  return `${r > 0 ? '+' : ''}${r.toFixed(dp)}`
}

function deltaClass(v: number): string | undefined {
  if (!Number.isFinite(v) || v === 0) return undefined
  return v > 0 ? 'bl__delta--pos' : 'bl__delta--neg'
}

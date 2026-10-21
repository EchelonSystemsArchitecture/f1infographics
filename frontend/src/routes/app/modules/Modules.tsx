import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { api } from '../../../api/client'
import type { RaceIntelligence, StrategyLab } from '../../../api/client'
import { CountUp } from '../../../components/bits'
import { staggerChild, staggerParent, usePrefersReducedMotion } from '../../../lib/motion'
import { useModule } from './useModule'
import './Modules.css'

function fmtLap(ms: number | null): string {
  if (ms == null) return '—'
  const m = Math.floor(ms / 60000)
  const s = (ms % 60000) / 1000
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

function ModeBadge({ mode }: { mode: string }) {
  const m = mode.toUpperCase()
  const cls =
    m === 'SIMULATION' ? 'badge badge-estimate' : m === 'REPLAY' ? 'badge badge-replay' : 'badge'
  return <span className={cls}>{m}</span>
}

function ModuleShell({
  title,
  sub,
  mode,
  note,
  loading,
  error,
  children,
}: {
  title: string
  sub: string
  mode?: string
  note?: string | null
  loading: boolean
  error: string | null
  children: ReactNode
}) {
  const reduced = usePrefersReducedMotion()
  return (
    <div className={`mod${reduced ? '' : ' mod--animate'}`}>
      <motion.div
        className="mod__head"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="mod__kicker">Pitwall module</p>
        <div className="mod__title-row">
          <h2 className="mod__title">
            {title.split(' ').slice(0, -1).join(' ')}{title.includes(' ') ? ' ' : ''}
            <em>{title.split(' ').slice(-1)[0]}</em>
          </h2>
          {mode && <ModeBadge mode={mode} />}
        </div>
      </motion.div>
      <p className="mod__sub">{sub}</p>
      {loading && <div className="mod__state mono">LOADING…</div>}
      {error && (
        <div className="mod__state mod__state--error mono" role="alert">
          FAILED TO LOAD · {error}
        </div>
      )}
      {!loading && !error && children}
      {note && <p className="mod__note">{note}</p>}
    </div>
  )
}

function Stat({ value, label, hero }: { value: string | number; label: string; hero?: boolean }) {
  const numeric = typeof value === 'number' && Number.isFinite(value)
  return (
    <motion.div className={`mod__stat${hero ? ' mod__stat--hero' : ''}`} variants={staggerChild}>
      <div className="mod__stat-value">
        {numeric ? (
          <CountUp to={value as number} duration={0.8} trigger="view" format="standard" />
        ) : (
          value
        )}
      </div>
      <div className="mod__stat-label">{label}</div>
    </motion.div>
  )
}

function Stats({ children }: { children: ReactNode }) {
  return (
    <motion.div className="mod__stats" variants={staggerParent} initial="initial" animate="animate">
      {children}
    </motion.div>
  )
}

function rowStyle(i: number): CSSProperties {
  return { '--i': Math.min(i, 16) } as CSSProperties
}

function FlagTimeline({ periods }: { periods: RaceIntelligence['flag_periods'] }) {
  const total = Math.max(7200, ...periods.map((p) => p.end_t ?? 0))
  return (
    <div className="flagline">
      <div className="flagline__track">
        {periods.map((p, i) =>
          p.start_t == null ? null : (
            <span
              key={i}
              className={`flagline__seg flagline__seg--${p.kind}`}
              style={{
                left: `${(p.start_t / total) * 100}%`,
                width: `${Math.max(0.6, (((p.end_t ?? p.start_t + 60) - p.start_t) / total) * 100)}%`,
              }}
              title={`${p.kind}${p.duration_s != null ? ` · ${Math.round(p.duration_s)}s` : ''}`}
            >
              <b className="mono">{p.kind}</b>
            </span>
          ),
        )}
      </div>
      <div className="flagline__axis mono">
        <span>START</span>
        <span>{Math.round(total / 60)} MIN</span>
      </div>
      {periods.length === 0 && <p className="mod__state mono">CLEAN RACE · NO SC / VSC / RED PERIODS</p>}
    </div>
  )
}

function OvertakeBars({
  made,
  suffered,
}: {
  made: RaceIntelligence['top_overtakers']
  suffered: RaceIntelligence['most_overtaken']
}) {
  const ids = Array.from(new Set([...made.slice(0, 10), ...suffered.slice(0, 10)].map((x) => x.driver_number)))
  const rows = ids
    .map((id) => {
      const m = made.find((x) => x.driver_number === id)
      const o = suffered.find((x) => x.driver_number === id)
      const ref = (m ?? o)!
      return { id, name: ref.name_acronym, colour: ref.team_colour, made: m?.count ?? 0, lost: o?.count ?? 0 }
    })
    .sort((x, y) => y.made - y.lost - (x.made - x.lost))
  const max = Math.max(1, ...rows.map((r) => Math.max(r.made, r.lost)))
  return (
    <div className="otb">
      {rows.map((r, i) => (
        <div key={r.id} className="otb__row" style={rowStyle(i)}>
          <span className="otb__lost">
            <em className="mono">{r.lost || ''}</em>
            <i style={{ width: `${(r.lost / max) * 100}%` }} />
          </span>
          <span className="otb__name">
            <span className="mod__swatch" style={{ background: `#${r.colour}` }} />
            {r.name}
          </span>
          <span className="otb__made">
            <i style={{ width: `${(r.made / max) * 100}%` }} />
            <em className="mono">{r.made || ''}</em>
          </span>
        </div>
      ))}
      <div className="otb__legend mono">
        <span>◀ OVERTAKEN</span>
        <span>OVERTAKES ▶</span>
      </div>
    </div>
  )
}

function SlopeChart({ movers, colours }: { movers: RaceIntelligence['position_movers']; colours: Map<number, string> }) {
  const rows = movers.filter((m) => m.grid != null && m.finish != null)
  const n = Math.max(20, ...rows.map((m) => Math.max(m.grid ?? 0, m.finish ?? 0)))
  const H = n * 22 + 20
  const y = (p: number) => 10 + ((p - 1) / (n - 1)) * (H - 20)
  return (
    <svg className="slope" viewBox={`0 0 360 ${H}`} role="img" aria-label="Grid to finish positions">
      {rows.map((m) => {
        const hex = colours.get(m.driver_number)
        const c = hex ? `#${hex}` : '#9a948b'
        const big = Math.abs(m.delta) >= 4
        return (
          <g key={m.driver_number} className={big ? 'is-big' : ''}>
            <line x1={80} x2={280} y1={y(m.grid!)} y2={y(m.finish!)} stroke={c} strokeWidth={big ? 3 : 1.5} opacity={big ? 1 : 0.45} />
            <circle cx={80} cy={y(m.grid!)} r={4} fill={c} />
            <circle cx={280} cy={y(m.finish!)} r={4} fill={c} />
            <text x={70} y={y(m.grid!) + 4} textAnchor="end">
              P{m.grid} {m.name_acronym}
            </text>
            <text x={290} y={y(m.finish!) + 4}>
              P{m.finish} {m.delta > 0 ? `+${m.delta}` : m.delta}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function IntelligenceView({ sessionKey }: { sessionKey: number }) {
  const { data, loading, error } = useModule(() => api.intelligence(sessionKey), [sessionKey])
  return (
    <ModuleShell
      title="Race Intelligence"
      sub="Deterministic race analytics derived from cached data — flag periods, pit stops, overtakes, and position swings. Nothing simulated."
      mode={data?.data_mode}
      loading={loading}
      error={error}
    >
      {data && (
        <>
          <Stats>
            <Stat hero value={data.total_pit_stops} label="Pit stops" />
            <Stat value={data.overtakes_total} label="Overtakes" />
            <Stat value={data.lead_changes} label="Lead changes" />
            <Stat value={data.flag_periods.length} label="Flag periods" />
          </Stats>

          <h3 className="mod__sub">Flag periods · session timeline</h3>
          <FlagTimeline periods={data.flag_periods} />

          <div className="intel__grid">
            <section>
              <h3 className="mod__sub">Overtakes · made vs suffered</h3>
              <OvertakeBars made={data.top_overtakers} suffered={data.most_overtaken} />
            </section>
            <section>
              <h3 className="mod__sub">Grid → finish</h3>
              <SlopeChart
                movers={data.position_movers}
                colours={new Map([...data.top_overtakers, ...data.most_overtaken, ...data.pit_aggregates].map((x) => [x.driver_number, x.team_colour]))}
              />
            </section>
          </div>
        </>
      )}
    </ModuleShell>
  )
}

const COMPOUND: Record<string, { c: string; ink: string; k: string }> = {
  SOFT: { c: '#e10600', ink: '#fff', k: 'S' },
  MEDIUM: { c: '#ffd12e', ink: '#1a1400', k: 'M' },
  HARD: { c: '#ece8e1', ink: '#141414', k: 'H' },
  INTERMEDIATE: { c: '#43b047', ink: '#06130a', k: 'I' },
  WET: { c: '#2f6fdb', ink: '#fff', k: 'W' },
}

function StintTimeline({ drivers }: { drivers: StrategyLab['drivers'] }) {
  const total = Math.max(1, ...drivers.flatMap((d) => d.stints.map((s) => s.lap_end)))
  const ticks = Array.from({ length: Math.floor(total / 10) + 1 }, (_, i) => i * 10).filter((t) => t > 0)
  const used = Array.from(new Set(drivers.flatMap((d) => d.stints.map((s) => (s.compound ?? '').toUpperCase())))).filter((c) => COMPOUND[c])
  return (
    <div className="stint">
      <div className="stint__legend">
        {used.map((c) => (
          <span key={c} className="stint__key mono">
            <i style={{ background: COMPOUND[c].c }} />
            {c}
          </span>
        ))}
      </div>
      <div className="stint__axis mono" aria-hidden="true">
        <span />
        <div>
          {ticks.map((t) => (
            <b key={t} style={{ left: `${(t / total) * 100}%` }}>
              L{t}
            </b>
          ))}
        </div>
      </div>
      {drivers.map((d, i) => (
        <div key={d.driver_number} className="stint__row" style={rowStyle(i)}>
          <span className="stint__name">
            <span className="mod__swatch" style={{ background: `#${d.team_colour}` }} />
            {d.name_acronym}
            <small className="mono">{d.stops} STOP{d.stops === 1 ? '' : 'S'}</small>
          </span>
          <div className="stint__track">
            {ticks.map((t) => (
              <i key={t} className="stint__tick" style={{ left: `${(t / total) * 100}%` }} />
            ))}
            {d.stints.length === 0 && <span className="stint__empty mono">NO STINT DATA</span>}
            {d.stints.map((st) => {
              const key = (st.compound ?? '').toUpperCase()
              const meta = COMPOUND[key] ?? { c: '#5a5650', ink: '#fff', k: '?' }
              const left = ((st.lap_start - 1) / total) * 100
              const width = (Math.max(1, st.lap_end - st.lap_start + 1) / total) * 100
              return (
                <span
                  key={st.stint_number}
                  className="stint__bar"
                  title={`${key || 'UNKNOWN'} · L${st.lap_start}–${st.lap_end}${st.tyre_age_at_start ? ` · ${st.tyre_age_at_start} laps old at start` : ''}`}
                  style={{ left: `${left}%`, width: `${width}%`, background: meta.c, color: meta.ink }}
                >
                  <b>{meta.k}</b>
                  <em className="mono">{st.lap_end - st.lap_start + 1}</em>
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StrategyView({ sessionKey }: { sessionKey: number }) {
  const { data, loading, error } = useModule(() => api.strategy(sessionKey), [sessionKey])
  return (
    <ModuleShell
      title="Strategy Lab"
      sub="Tyre stints, compound sequences, and pit windows for every driver — reconstructed from stint and pit data."
      mode={data?.data_mode}
      loading={loading}
      error={error}
    >
      {data && (
        <>
          <Stats>
            <Stat hero value={data.most_common_stops ?? '—'} label="Most common stops" />
            <Stat value={data.drivers.length} label="Drivers" />
            <div className="mod__stat stophist">
              <div className="stophist__bars">
                {Object.entries(data.stop_histogram).map(([k, v]) => {
                  const max = Math.max(...Object.values(data.stop_histogram))
                  return (
                    <span key={k} className="stophist__col" title={`${v} drivers made ${k} stops`}>
                      <b className="mono">{v}</b>
                      <i style={{ height: `${(v / max) * 100}%` }} />
                      <em className="mono">{k}</em>
                    </span>
                  )
                })}
              </div>
              <div className="mod__stat-label">Drivers by number of stops</div>
            </div>
          </Stats>
          <StintTimeline drivers={data.drivers} />
        </>
      )}
    </ModuleShell>
  )
}

export function DriverLabView({ sessionKey }: { sessionKey: number }) {
  const { data, loading, error } = useModule(() => api.driverLab(sessionKey), [sessionKey])
  return (
    <ModuleShell
      title="Driver Lab"
      sub="Per-driver race performance: grid to finish, best and average race pace, pit stops, and points."
      mode={data?.data_mode}
      loading={loading}
      error={error}
    >
      {data && (() => {
        const best = Math.min(...data.drivers.map((r) => r.best_lap_ms ?? Infinity))
        const avgs = data.drivers.map((r) => r.avg_lap_ms).filter((v): v is number => v != null)
        const span = Math.max(1, Math.max(...avgs) - best)
        const rows = [...data.drivers].sort((x, y) => (x.finish ?? 99) - (y.finish ?? 99))
        return (
          <div className="dl">
            <div className="dl__legend mono">
              <span><i className="dl__k dl__k--best" />BEST LAP</span>
              <span><i className="dl__k dl__k--avg" />AVG LAP</span>
              <span>BAR = GAP TO SESSION BEST ({fmtLap(best)})</span>
            </div>
            {rows.map((r, i) => {
              const bp = r.best_lap_ms != null ? ((r.best_lap_ms - best) / span) * 100 : null
              const ap = r.avg_lap_ms != null ? ((r.avg_lap_ms - best) / span) * 100 : null
              return (
                <div key={r.driver_number} className="dl__row" style={{ ...rowStyle(i), ['--tc' as string]: `#${r.team_colour}` }}>
                  <span className="dl__pos mono">{r.finish ?? (r.dnf ? 'DNF' : '—')}</span>
                  <span className="dl__who">
                    <b>{r.name_acronym}</b>
                    <small>{r.team_name}</small>
                  </span>
                  <span className="dl__move mono">
                    P{r.grid ?? '—'} → P{r.finish ?? '—'}
                    <em className={(r.delta ?? 0) >= 0 ? 'mod__pos' : 'mod__neg'}>
                      {r.delta == null ? '' : r.delta >= 0 ? ` +${r.delta}` : ` ${r.delta}`}
                    </em>
                  </span>
                  <span className="dl__pace">
                    {ap != null && <i className="dl__avg" style={{ width: `${Math.max(2, ap)}%` }} />}
                    {bp != null && <i className="dl__best" style={{ left: `${bp}%` }} />}
                  </span>
                  <span className="dl__times mono">
                    {fmtLap(r.best_lap_ms)}
                    <small>{fmtLap(r.avg_lap_ms)}</small>
                  </span>
                  <span className="dl__meta mono">
                    {r.pits} PIT{r.pits === 1 ? '' : 'S'}
                    <b>{r.points} PTS</b>
                  </span>
                </div>
              )
            })}
          </div>
        )
      })()}
    </ModuleShell>
  )
}

export function ConstructorView({ sessionKey }: { sessionKey: number }) {
  const { data, loading, error } = useModule(() => api.constructorLab(sessionKey), [sessionKey])
  return (
    <ModuleShell
      title="Constructor Lab"
      sub="Team-level results for this session: points, best finish, and net positions gained."
      mode={data?.data_mode}
      loading={loading}
      error={error}
    >
      {data && (() => {
        const rows = [...data.constructors].sort((x, y) => y.points - x.points)
        const max = Math.max(1, ...rows.map((c) => c.points))
        const gmax = Math.max(1, ...rows.map((c) => Math.abs(c.positions_gained)))
        return (
          <div className="cl">
            {rows.map((c, i) => (
              <div key={c.team_name} className="cl__row" style={{ ...rowStyle(i), ['--tc' as string]: `#${c.team_colour}` }}>
                <span className="cl__rank mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="cl__name">{c.team_name}</span>
                <span className="cl__bar">
                  <i style={{ width: `${(c.points / max) * 100}%` }} />
                  <b className="mono">{c.points} PTS</b>
                </span>
                <span className="cl__gain">
                  <i
                    className={c.positions_gained >= 0 ? 'is-pos' : 'is-neg'}
                    style={{ width: `${(Math.abs(c.positions_gained) / gmax) * 50}%` }}
                  />
                  <em className="mono">{c.positions_gained > 0 ? `+${c.positions_gained}` : c.positions_gained}</em>
                </span>
                <span className="cl__fin mono">
                  BEST P{c.best_finish ?? '—'}
                  <small>AVG {c.avg_finish != null ? c.avg_finish.toFixed(1) : '—'}</small>
                </span>
              </div>
            ))}
            <div className="cl__legend mono">
              <span>POINTS</span>
              <span>POSITIONS GAINED / LOST</span>
              <span>FINISHES</span>
            </div>
          </div>
        )
      })()}
    </ModuleShell>
  )
}

export function PredictionView({ sessionKey }: { sessionKey: number }) {
  const { data, loading, error } = useModule(() => api.prediction(sessionKey), [sessionKey])
  return (
    <ModuleShell
      title="Prediction Arena"
      sub="A transparent what-if simulation (free, non-monetary). It predicts finishing order from observed pace and scores itself against a grid-only baseline — it is a SIMULATION, not a forecast."
      mode={data?.data_mode}
      note={data?.note}
      loading={loading}
      error={error}
    >
      {data && (
        <>
          <Stats>
            <Stat hero value={data.method} label="Method" />
            <Stat value={data.accuracy_vs_baseline.baseline_mae} label="Baseline MAE" />
            <Stat value={data.accuracy_vs_baseline.model_mae} label="Pace model MAE" />
            <Stat
              value={`+${data.accuracy_vs_baseline.improvement}`}
              label="Improvement vs baseline"
            />
          </Stats>
          <table className="mod__table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Grid</th>
                <th>Predicted</th>
                <th>Actual</th>
                <th>Hit</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, i) => (
                <tr key={e.driver_number} className="mod__row" style={rowStyle(i)}>
                  <td className="name">{e.name_acronym}</td>
                  <td>{e.grid ?? '—'}</td>
                  <td>{e.predicted_finish}</td>
                  <td>{e.actual_finish ?? '—'}</td>
                  <td className={e.predicted_finish === e.actual_finish ? 'mod__pos' : 'mod__neg'}>
                    {e.predicted_finish === e.actual_finish ? '✓' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </ModuleShell>
  )
}

export function SettingsView({ sessionKey }: { sessionKey: number }) {
  const { data, loading, error } = useModule(() => api.diagnostics(sessionKey), [sessionKey])
  return (
    <ModuleShell
      title="Settings & Diagnostics"
      sub="Runtime diagnostics — data provenance, ingested sessions, session-store cache, and dataset presence for the active session."
      mode={data?.data_mode}
      loading={loading}
      error={error}
    >
      {data && (
        <>
          <Stats>
            <Stat hero value={data.ingested_sessions} label="Ingested sessions" />
            <Stat value={data.session_store.sessions_cached ?? 0} label="Cached in store" />
            <Stat value={data.session_key ?? '—'} label="Active session" />
          </Stats>
          <p className="mod__sub">Data dir: {data.data_dir}</p>
          <h3 className="mod__sub">Dataset presence</h3>
          <table className="mod__table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Present</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.datasets_present).map(([name, present], i) => (
                <tr key={name} className="mod__row" style={rowStyle(i)}>
                  <td className="name">{name}</td>
                  <td className={present ? 'mod__pos' : 'mod__neg'}>{present ? 'YES' : 'NO'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </ModuleShell>
  )
}

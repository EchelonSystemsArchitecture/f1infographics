import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { api } from '../../../api/client'
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

          <h3 className="mod__sub">Flag periods</h3>
          {data.flag_periods.length === 0 ? (
            <div className="mod__state mono">NO SC / VSC / RED PERIODS</div>
          ) : (
            <motion.div variants={staggerParent} initial="initial" animate="animate">
              {data.flag_periods.map((p, i) => (
                <motion.span
                  key={i}
                  variants={staggerChild}
                  className={`mod__flag mod__flag--${p.kind}`}
                >
                  {p.kind}
                  {p.duration_s != null ? ` · ${Math.round(p.duration_s)}s` : ''}
                </motion.span>
              ))}
            </motion.div>
          )}

          <h3 className="mod__sub">Top overtakers</h3>
          <table className="mod__table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Overtakes made</th>
                <th>Overtaken</th>
              </tr>
            </thead>
            <tbody>
              {data.top_overtakers.slice(0, 8).map((o, i) => (
                <tr key={o.driver_number} className="mod__row" style={rowStyle(i)}>
                  <td className="name">
                    <span className="mod__swatch" style={{ background: `#${o.team_colour}` }} />
                    {o.name_acronym}
                  </td>
                  <td>{o.count}</td>
                  <td>{data.most_overtaken.find((m) => m.driver_number === o.driver_number)?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="mod__sub">Position movers (grid → finish)</h3>
          <table className="mod__table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Grid</th>
                <th>Finish</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {[...data.position_movers]
                .sort((a, b) => b.delta - a.delta)
                .slice(0, 6)
                .concat([...data.position_movers].sort((a, b) => a.delta - b.delta).slice(0, 3))
                .map((m, i) => (
                  <tr
                    key={`${m.driver_number}-${m.grid}-${m.finish}`}
                    className="mod__row"
                    style={rowStyle(i)}
                  >
                    <td className="name">{m.name_acronym}</td>
                    <td>{m.grid ?? '—'}</td>
                    <td>{m.finish ?? '—'}</td>
                    <td className={m.delta >= 0 ? 'mod__pos' : 'mod__neg'}>
                      {m.delta >= 0 ? `+${m.delta}` : m.delta}
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
            <Stat
              value={Object.entries(data.stop_histogram).map(([k, v]) => `${k}×:${v}`).join('  ')}
              label="Stop histogram"
            />
          </Stats>
          <table className="mod__table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Stops</th>
                <th>Compounds</th>
                <th>Stint plan</th>
              </tr>
            </thead>
            <tbody>
              {data.drivers.map((d, i) => (
                <tr key={d.driver_number} className="mod__row" style={rowStyle(i)}>
                  <td className="name">
                    <span className="mod__swatch" style={{ background: `#${d.team_colour}` }} />
                    {d.name_acronym}
                  </td>
                  <td>{d.stops}</td>
                  <td>
                    {d.compounds.map((c, j) => (
                      <span key={j} className="mod__chip">
                        {c}
                      </span>
                    ))}
                  </td>
                  <td>
                    {d.stints.map((s) => (
                      <span key={s.stint_number} className="mod__chip">
                        L{s.lap_start}–{s.lap_end}
                      </span>
                    ))}
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
      {data && (
        <table className="mod__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Driver</th>
              <th>Team</th>
              <th>Grid</th>
              <th>Fin</th>
              <th>Δ</th>
              <th>Best lap</th>
              <th>Avg lap</th>
              <th>Pits</th>
              <th>Pts</th>
            </tr>
          </thead>
            <tbody>
              {data.drivers.map((r, i) => (
                <tr key={r.driver_number} className="mod__row" style={rowStyle(i)}>
                  <td>{r.finish ?? '—'}</td>
                <td className="name">
                  <span className="mod__swatch" style={{ background: `#${r.team_colour}` }} />
                  {r.name_acronym}
                </td>
                <td>{r.team_name}</td>
                <td>{r.grid ?? '—'}</td>
                <td>{r.finish ?? (r.dnf ? 'DNF' : '—')}</td>
                <td className={(r.delta ?? 0) >= 0 ? 'mod__pos' : 'mod__neg'}>
                  {r.delta == null ? '—' : r.delta >= 0 ? `+${r.delta}` : r.delta}
                </td>
                <td>{fmtLap(r.best_lap_ms)}</td>
                <td>{fmtLap(r.avg_lap_ms)}</td>
                <td>{r.pits}</td>
                <td>{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
      {data && (
        <table className="mod__table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Points</th>
              <th>Best finish</th>
              <th>Avg finish</th>
              <th>Positions Δ</th>
              <th>Drivers</th>
            </tr>
          </thead>
            <tbody>
              {data.constructors.map((c, i) => (
                <tr key={c.team_name} className="mod__row" style={rowStyle(i)}>
                  <td className="name">
                    <span className="mod__swatch" style={{ background: `#${c.team_colour}` }} />
                    {c.team_name}
                  </td>
                <td>{c.points}</td>
                <td>{c.best_finish ?? '—'}</td>
                <td>{c.avg_finish != null ? c.avg_finish.toFixed(1) : '—'}</td>
                <td className={c.positions_gained >= 0 ? 'mod__pos' : 'mod__neg'}>
                  {c.positions_gained >= 0 ? `+${c.positions_gained}` : c.positions_gained}
                </td>
                <td>{c.driver_numbers.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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

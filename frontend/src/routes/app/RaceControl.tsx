import { useState } from 'react'
import { motion } from 'motion/react'
import { useClock } from '../../store/clock'
import { useCircuit, useDriverColour, useRaceState } from '../../hooks/useFlagship'
import { TimingTower } from '../../components/timing/TimingTower'
import { TrackCanvas } from '../../components/stage/TrackCanvas'
import { RaceRibbon } from '../../components/ribbon/RaceRibbon'
import { CountUp } from '../../components/bits'
import { staggerChild, staggerParent } from '../../lib/motion'
import type { DriverInfo, RaceControlEvent, SessionInfo } from '../../api/client'
import { FLAGSHIP_SESSION_KEY } from '../../data/flagship'
import './RaceControl.css'

export function RaceControl({
  session,
  drivers,
  raceControl,
  sessionKey = FLAGSHIP_SESSION_KEY,
}: {
  session?: SessionInfo | null
  drivers?: DriverInfo[]
  raceControl?: RaceControlEvent[]
  sessionKey?: number
}) {
  const state = useRaceState(sessionKey)
  const t = useClock((s) => s.t)
  const seek = useClock((s) => s.seek)
  const colours = useDriverColour(drivers ?? [])
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)
  const teams = new Map<number, string>()
  for (const d of drivers ?? []) teams.set(d.driver_number, d.team_name)
  const circuit = useCircuit(sessionKey)
  const startMs = session?.date_start ? Date.parse(session.date_start) : Number.NaN

  const timing = state?.timing ?? []
  const names = new Map(timing.map((r) => [r.driver_number, r.name_acronym]))
  const leader = timing.find((r) => r.position === 1) ?? null
  const fastest = timing.filter((r) => r.last_lap_ms).sort((x, y) => (x.last_lap_ms ?? 0) - (y.last_lap_ms ?? 0))[0] ?? null
  const formatLap = (ms: number) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`

  return (
    <div className="rc">
      <motion.div className="rc__kpis" variants={staggerParent} initial="initial" animate="animate">
        <motion.div className="rc__kpi rc__kpi--leader" variants={staggerChild}>
          <span className="rc__kpi-label">Leader</span>
          <div className="rc__kpi-value-row">
            {leader ? (
              <span className="rc__kpi-driver">
                <i style={{ background: `#${leader.team_colour}` }} />
                {leader.name_acronym}
                <small className="mono">#{leader.driver_number}</small>
              </span>
            ) : (
              <span className="rc__kpi-unavailable mono">—</span>
            )}
          </div>
        </motion.div>
        <motion.div className="rc__kpi" variants={staggerChild}>
          <span className="rc__kpi-label">Fastest last lap</span>
          <div className="rc__kpi-value-row">
            {fastest ? (
              <span className="rc__kpi-time mono">
                {formatLap(fastest.last_lap_ms ?? 0)} <small>{fastest.name_acronym}</small>
              </span>
            ) : (
              <span className="rc__kpi-unavailable mono">— no laps yet</span>
            )}
          </div>
        </motion.div>
        <motion.div className="rc__kpi" variants={staggerChild}>
          <span className="rc__kpi-label">Track status</span>
          <div className="rc__kpi-value-row rc__kpi-flags">
            {state?.red_flag && <span className="rc__flag rc__flag--red">RED FLAG</span>}
            {state?.sc && <span className="rc__flag rc__flag--sc">SAFETY CAR</span>}
            {state?.vsc && <span className="rc__flag rc__flag--vsc">VSC</span>}
            {!state?.red_flag && !state?.sc && !state?.vsc && (
              <span className="rc__kpi-clear">GREEN</span>
            )}
          </div>
        </motion.div>
        <motion.div className="rc__kpi" variants={staggerChild}>
          <span className="rc__kpi-label">Cars on track</span>
          <div className="rc__kpi-value-row">
            {state && state.marker_mode !== 'UNAVAILABLE' ? (
              <CountUp to={state.markers?.length ?? 0} duration={0.6} className="rc__kpi-cars mono" />
            ) : (
              <span className="rc__kpi-unavailable mono">—</span>
            )}
          </div>
          {state && state.marker_mode === 'UNAVAILABLE' && (
            <span className="rc__kpi-note mono">no location data</span>
          )}
        </motion.div>
      </motion.div>

      <div className="rc__grid">
        <motion.div
          className="rc__tower"
          variants={staggerChild}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.12 }}
        >
          <TimingTower
            rows={state?.timing ?? []}
            colours={colours}
            teams={teams}
            markerMode={state?.marker_mode}
            selected={selectedDriver}
            onSelectDriver={setSelectedDriver}
          />
        </motion.div>

        <motion.div
          className="rc__center"
          variants={staggerChild}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <div className="rc__stage">
            <TrackCanvas
              circuit={circuit}
              markers={state?.markers ?? []}
              colours={colours}
              names={names}
              selected={selectedDriver}
              onSelectDriver={setSelectedDriver}
            />
          </div>
          <div className="rc__track-status">
            <span className="rc__track-label mono">TRACK MAP</span>
            {(!state || state.marker_mode !== 'REPLAY') && (
              <span className="rc__track-hint">
                {state?.marker_mode === 'UNAVAILABLE'
                  ? 'LOCATION INGEST REQUIRED FOR LIVE MARKERS'
                  : 'MARKERS ESTIMATED · LOCATION INGEST PENDING'}
              </span>
            )}
            {state?.marker_mode && state.marker_mode !== 'REPLAY' && (
              <span className={`badge badge-${state.marker_mode.toLowerCase()}`}>
                {state.marker_mode}
              </span>
            )}
          </div>
        </motion.div>

        <motion.div
          className="rc__feed"
          variants={staggerChild}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.28 }}
        >
          <header className="rc__feed-header mono">Race control</header>
          <div className="rc__feed-list">
            {(raceControl ?? []).map((ev, i) => {
              const evT = eventSeconds(ev, startMs)
              const past = evT <= t
              return (
                <button
                  key={`${ev.date}-${i}`}
                  type="button"
                  className={`rc__event${past ? ' rc__event--past' : ' rc__event--future'}`}
                  onClick={() => seek(evT)}
                >
                  <div className="rc__event-meta mono">
                    <span className="rc__event-lap">L{ev.lap_number ?? '—'}</span>
                    <span className={flagClass(ev.flag ?? ev.category)}>
                      {ev.flag ?? ev.category ?? ''}
                    </span>
                  </div>
                  <p className="rc__event-msg">{ev.message}</p>
                </button>
              )
            })}
            {(raceControl ?? []).length === 0 && (
              <div className="rc__feed-empty mono">NO EVENTS</div>
            )}
          </div>
        </motion.div>
      </div>
      <RaceRibbon events={raceControl ?? []} startMs={startMs} />
    </div>
  )
}

function eventSeconds(ev: RaceControlEvent, startMs: number): number {
  const t = Date.parse(ev.date)
  if (!Number.isFinite(t) || !Number.isFinite(startMs)) return Number.POSITIVE_INFINITY
  return (t - startMs) / 1000
}

function flagClass(flag: string | null): string {
  const f = (flag ?? '').toUpperCase()
  if (f.includes('RED')) return 'rc__event-flag rc__event-flag--red'
  if (f.includes('VSC') || f.includes('YELLOW')) return 'rc__event-flag rc__event-flag--vsc'
  if (f.includes('SAFETY') || f === 'SC') return 'rc__event-flag rc__event-flag--sc'
  return 'rc__event-flag'
}

import { useState } from 'react'
import { motion } from 'motion/react'
import { useClock } from '../../store/clock'
import { useCircuit, useDriverColour, useRaceState } from '../../hooks/useFlagship'
import { TimingTower } from '../../components/timing/TimingTower'
import { CircuitStage } from '../../components/stage/CircuitStage'
import { SpeedField } from '../../components/stage/SpeedField'
import { SpeedTunnel } from '../../components/stage/SpeedTunnel'
import { RaceRibbon } from '../../components/ribbon/RaceRibbon'
import { CountUp } from '../../components/bits'
import { staggerChild, staggerParent } from '../../lib/motion'
import type { DriverInfo, RaceControlEvent, SessionInfo } from '../../api/client'
import { formatClock } from '../../utils/format'
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

  return (
    <div className="rc">
      <motion.div className="rc__kpis" variants={staggerParent} initial="initial" animate="animate">
        <motion.div className="rc__kpi" variants={staggerChild}>
          <span className="rc__kpi-label">Lap</span>
          <div className="rc__kpi-value-row">
            <CountUp to={state?.current_lap ?? 0} duration={0.7} className="rc__kpi-lap mono" />
          </div>
        </motion.div>
        <motion.div className="rc__kpi" variants={staggerChild}>
          <span className="rc__kpi-label">Session time</span>
          <div className="rc__kpi-value-row">
            <span className="rc__kpi-time mono">{formatClock(t)}</span>
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
            <CountUp to={state?.markers?.length ?? 0} duration={0.6} className="rc__kpi-cars mono" />
          </div>
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
            <SpeedTunnel />
            <SpeedField />
            <CircuitStage
              circuit={circuit}
              markers={state?.markers ?? []}
              colours={colours}
              selected={selectedDriver}
              onSelectDriver={setSelectedDriver}
            />
          </div>
          <div className="rc__track-status">
            <span className="rc__track-label mono">TRACK MAP</span>
            <span className="rc__track-lap mono">
              LAP {state?.current_lap ?? '—'}
            </span>
            <span className="rc__track-time mono">{formatClock(t)}</span>
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

import { useClock } from '../../store/clock'
import { useCircuit, useDriverColour, useRaceState } from '../../hooks/useFlagship'
import { TimingTower } from '../../components/timing/TimingTower'
import { ReplayControls } from '../../components/replay/ReplayControls'
import { TrackMap } from '../../components/track/TrackMap'
import type { DriverInfo, RaceControlEvent, SessionInfo } from '../../api/client'
import { formatClock } from '../../utils/format'
import './RaceControl.css'

export function RaceControl({
  session,
  drivers,
  raceControl,
}: {
  session?: SessionInfo | null
  drivers?: DriverInfo[]
  raceControl?: RaceControlEvent[]
}) {
  const state = useRaceState()
  const t = useClock((s) => s.t)
  const colours = useDriverColour(drivers ?? [])
  const teams = new Map<number, string>()
  for (const d of drivers ?? []) teams.set(d.driver_number, d.team_name)
  const circuit = useCircuit()
  const startMs = session?.date_start ? Date.parse(session.date_start) : Number.NaN

  return (
    <div className="rc">
      <div className="rc__grid">
        <TimingTower rows={state?.timing ?? []} colours={colours} teams={teams} markerMode={state?.marker_mode} />
        <div className="rc__center">
          <div className="rc__track">
            <TrackMap circuit={circuit} markers={state?.markers ?? []} colours={colours} width={520} />
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
          <div className="rc__flags">
            {state?.sc && <span className="rc__flag rc__flag--sc">SC</span>}
            {state?.vsc && <span className="rc__flag rc__flag--vsc">VSC</span>}
            {state?.red_flag && <span className="rc__flag rc__flag--red">RED</span>}
          </div>
        </div>
        <div className="rc__feed">
          <header className="rc__feed-header mono">RACE CONTROL</header>
          <div className="rc__feed-list">
            {(raceControl ?? []).map((ev, i) => {
              const evT = eventSeconds(ev, startMs)
              const past = evT <= t
              return (
                <div
                  key={`${ev.date}-${i}`}
                  className={`rc__event${past ? ' rc__event--past' : ' rc__event--future'}`}
                >
                  <div className="rc__event-meta mono">
                    <span className="rc__event-lap">L{ev.lap_number ?? '—'}</span>
                    <span className="rc__event-flag">{ev.flag ?? ev.category ?? ''}</span>
                  </div>
                  <p className="rc__event-msg">{ev.message}</p>
                </div>
              )
            })}
            {(raceControl ?? []).length === 0 && (
              <div className="rc__feed-empty mono">NO EVENTS</div>
            )}
          </div>
        </div>
      </div>
      <ReplayControls />
    </div>
  )
}

/** Convert an RC event ISO date to race-clock seconds (from session start). */
function eventSeconds(ev: RaceControlEvent, startMs: number): number {
  const t = Date.parse(ev.date)
  if (!Number.isFinite(t) || !Number.isFinite(startMs)) return Number.POSITIVE_INFINITY
  return (t - startMs) / 1000
}

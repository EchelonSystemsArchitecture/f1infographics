import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { PitRail } from '../../components/app/PitRail'
import { PitLoader } from '../../components/app/PitLoader'
import { ClockDriver } from '../../components/clock/ClockDriver'
import { useFlagship, useRaceState } from '../../hooks/useFlagship'
import { FLAGSHIP_SESSION_KEY } from '../../data/flagship'
import { useClock } from '../../store/clock'
import { formatClock } from '../../utils/format'
import { latestRaceControlEvent } from '../../utils/raceControl'
import { EASE_OUT } from '../../lib/motion'
import { CountUp } from '../../components/bits'
import { RaceControl } from './RaceControl'
import { BattleLab } from './BattleLab'
import { SessionPicker } from './SessionPicker'
import {
  ConstructorView,
  DriverLabView,
  IntelligenceView,
  PredictionView,
  SettingsView,
  StrategyView,
} from './modules/Modules'
import './AppShell.css'

function dataBadgeClass(mode: string | null | undefined): string {
  const m = (mode ?? 'REPLAY').toUpperCase()
  if (m === 'LIVE') return 'badge badge-live'
  if (m === 'ESTIMATE') return 'badge badge-estimate'
  if (m === 'REPLAY') return 'badge badge-replay'
  return 'badge'
}

export function AppShell() {
  const [pickedKey, setPickedKey] = useState<number | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const sessionKey = pickedKey ?? FLAGSHIP_SESSION_KEY
  const { session, drivers, raceControl, loading, error } = useFlagship(sessionKey)
  const state = useRaceState(sessionKey)
  const t = useClock((s) => s.t)
  const location = useLocation()
  const navigate = useNavigate()
  const needsPicker = showPicker || (!loading && !error && !session)

  const handlePick = (key: number) => {
    setPickedKey(key)
    setShowPicker(false)
    if (location.pathname.replace(/\/+$/, '') === '/app/vault') navigate('/app')
  }

  const startMs = session?.date_start ? Date.parse(session.date_start) : Number.NaN
  const latestMsg = latestRaceControlEvent(raceControl, startMs, t)

  return (
    <div className="app">
      <ClockDriver />
      <PitLoader trigger={location.pathname} />
      <PitRail
        intro={false}
        sessionLabel={session ? `${session.circuit_short_name} · ${session.year}` : 'Choose a session'}
        sessionBadge={<span className={dataBadgeClass(session?.data_mode)}>{session?.data_mode ?? 'REP'}</span>}
        onSessions={() => setShowPicker((v) => !v)}
      />
      <div className="app__main">
        <header className="app__statusbar">
          <div className="app__status-left">
            <h1 className="app__status-title">
              {session ? (
                <span className="app__status-title-text">
                  {session.session_name} <em>{session.circuit_short_name}</em> <small>{session.year}</small>
                </span>
              ) : (
                'Race'
              )}
            </h1>
          </div>
          <div className="app__status-center">
            {state && (
              <>
                <div className="app__lap">
                  <span className="app__lap-label">LAP</span>
                  <CountUp
                    to={state.current_lap ?? 0}
                    duration={0.6}
                    className="app__lap-num mono"
                  />
                </div>
                <span className="app__clock mono">{formatClock(t)}</span>
              </>
            )}
          </div>
          <div className="app__status-right">
            <span className="app__status-meta mono">
              {session?.session_type?.toUpperCase() ?? ''}
            </span>
            <span className={dataBadgeClass(session?.data_mode)}>
              {session?.data_mode ?? 'REPLAY'}
            </span>
          </div>
        </header>
        {latestMsg && (
          <div className="app__ticker" role="status" aria-live="polite">
            <span className="app__ticker-tag mono">RC</span>
            <span className="app__ticker-msg">{latestMsg.message}</span>
          </div>
        )}
        <div className="app__content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="app__route"
            >
              {needsPicker ? (
                <SessionPicker onPick={handlePick} />
              ) : (
                <>
                  {error && (
                    <div className="app__error mono" role="alert">
                      FAILED TO LOAD SESSION DATA · {error}
                    </div>
                  )}
                  {loading && !error && (
                    <div className="app__loading mono">LOADING SESSION…</div>
                  )}
                  {!loading && !error && (
                    <Routes location={location}>
                      <Route
                        index
                        element={
                          <RaceControl
                            session={session}
                            drivers={drivers}
                            raceControl={raceControl}
                            sessionKey={sessionKey}
                            state={state}
                          />
                        }
                      />
                      <Route path="battle" element={<BattleLab drivers={drivers} sessionKey={sessionKey} />} />
                      <Route path="intelligence" element={<IntelligenceView sessionKey={sessionKey} />} />
                      <Route path="strategy" element={<StrategyView sessionKey={sessionKey} />} />
                      <Route path="driver" element={<DriverLabView sessionKey={sessionKey} />} />
                      <Route path="constructor" element={<ConstructorView sessionKey={sessionKey} />} />
                      <Route path="vault" element={<SessionPicker onPick={handlePick} />} />
                      <Route path="prediction" element={<PredictionView sessionKey={sessionKey} />} />
                      <Route path="settings" element={<SettingsView sessionKey={sessionKey} />} />
                      <Route
                        path="*"
                        element={
                          <RaceControl
                            session={session}
                            drivers={drivers}
                            raceControl={raceControl}
                            sessionKey={sessionKey}
                            state={state}
                          />
                        }
                      />
                    </Routes>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

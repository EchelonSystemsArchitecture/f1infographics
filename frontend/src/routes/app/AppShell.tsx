import { useState, type ReactElement } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ClockDriver } from '../../components/clock/ClockDriver'
import { useFlagship, useRaceState } from '../../hooks/useFlagship'
import { FLAGSHIP_SESSION_KEY } from '../../data/flagship'
import { useClock } from '../../store/clock'
import { formatClock } from '../../utils/format'
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

const ICONS: Record<string, ReactElement> = {
  race: (
    <>
      <path d="M4 15V4l6 2 6-2v11l-6-2-6 2Z" />
      <path d="M4 4h12" />
    </>
  ),
  battle: (
    <>
      <path d="M9 3h6M12 3v5l4 8a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l4-8V3" />
      <path d="M7.5 14h9" />
    </>
  ),
  intelligence: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </>
  ),
  strategy: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M8 6h6a2 2 0 0 1 2 2v2M8 18h6a2 2 0 0 0 2-2v-2" />
    </>
  ),
  driver: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  constructor: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5M17.5 19a6 6 0 0 0-2-4.2" />
    </>
  ),
  vault: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2" />
    </>
  ),
  prediction: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
}

const NAV: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/app', label: 'Race Control', icon: 'race', end: true },
  { to: '/app/battle', label: 'Battle Lab', icon: 'battle' },
  { to: '/app/intelligence', label: 'Race Intelligence', icon: 'intelligence' },
  { to: '/app/strategy', label: 'Strategy Lab', icon: 'strategy' },
  { to: '/app/driver', label: 'Driver Lab', icon: 'driver' },
  { to: '/app/constructor', label: 'Constructor Lab', icon: 'constructor' },
  { to: '/app/vault', label: 'Race Vault', icon: 'vault' },
  { to: '/app/prediction', label: 'Prediction Arena', icon: 'prediction' },
]

function dataBadgeClass(mode: string | null | undefined): string {
  const m = (mode ?? 'REPLAY').toUpperCase()
  if (m === 'LIVE') return 'badge badge-live'
  if (m === 'ESTIMATE') return 'badge badge-estimate'
  if (m === 'REPLAY') return 'badge badge-replay'
  return 'badge'
}

function RailIcon({ name }: { name: string }) {
  return (
    <svg
      className="app__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

export function AppShell() {
  const [pickedKey, setPickedKey] = useState<number | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const sessionKey = pickedKey ?? FLAGSHIP_SESSION_KEY
  const { session, drivers, raceControl, loading, error } = useFlagship(sessionKey)
  const state = useRaceState(sessionKey)
  const t = useClock((s) => s.t)
  const location = useLocation()
  const needsPicker = showPicker || (!loading && !error && !session)

  const handlePick = (key: number) => {
    setPickedKey(key)
    setShowPicker(false)
  }

  const latestMsg = raceControl && raceControl.length > 0 ? raceControl[raceControl.length - 1] : null

  return (
    <div className="app">
      <ClockDriver />
      <aside className="app__rail">
        <div className="app__mark" aria-label="GRIDTRACE">
          <span className="app__mark-glyph">GT</span>
        </div>
        <nav className="app__nav" aria-label="Modules">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                `app__nav-item${isActive ? ' app__nav-item--active' : ''}`
              }
            >
              <RailIcon name={item.icon} />
            </NavLink>
          ))}
        </nav>
        <div className="app__rail-footer">
          <NavLink
            to="/app/settings"
            title="Settings"
            aria-label="Settings"
            className={({ isActive }) =>
              `app__nav-item app__nav-item--util${isActive ? ' app__nav-item--active' : ''}`
            }
          >
            <RailIcon name="settings" />
          </NavLink>
          <button
            type="button"
            className="app__session-switch"
            title={
              session
                ? `${session.circuit_short_name} · ${session.year} ${session.session_name}`
                : 'Choose session'
            }
            aria-label="Choose session"
            onClick={() => setShowPicker((v) => !v)}
          >
            <span className={dataBadgeClass(session?.data_mode)}>
              {session?.data_mode ?? 'REP'}
            </span>
          </button>
        </div>
      </aside>
      <div className="app__main">
        <header className="app__statusbar">
          <div className="app__status-left">
            <h1 className="app__status-title">
              {session?.session_name ?? 'Race'}{' '}
              <span className="app__status-sub">
                {session?.circuit_short_name ?? ''} {session?.year ?? ''}
              </span>
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
                          />
                        }
                      />
                      <Route path="battle" element={<BattleLab drivers={drivers} />} />
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

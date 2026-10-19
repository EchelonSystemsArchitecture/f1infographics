import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { ClockDriver } from '../../components/clock/ClockDriver'
import { useFlagship, useRaceState } from '../../hooks/useFlagship'
import { FLAGSHIP_SESSION_KEY } from '../../data/flagship'
import { useClock } from '../../store/clock'
import { formatClock } from '../../utils/format'
import { RaceControl } from './RaceControl'
import { BattleLab } from './BattleLab'
import { SessionPicker } from './SessionPicker'
import './AppShell.css'

const NAV: { to: string; label: string; disabled?: boolean }[] = [
  { to: '/app', label: 'Race Control' },
  { to: '/app/battle', label: 'Battle Lab' },
  { to: '/app/intelligence', label: 'Race Intelligence', disabled: true },
  { to: '/app/strategy', label: 'Strategy Lab', disabled: true },
  { to: '/app/driver', label: 'Driver Lab', disabled: true },
  { to: '/app/constructor', label: 'Constructor Lab', disabled: true },
  { to: '/app/vault', label: 'Race Vault', disabled: true },
  { to: '/app/prediction', label: 'Prediction Arena', disabled: true },
  { to: '/app/settings', label: 'Settings', disabled: true },
]

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
  const needsPicker = showPicker || (!loading && !error && !session)

  const handlePick = (key: number) => {
    setPickedKey(key)
    setShowPicker(false)
  }

  return (
    <div className="app">
      <ClockDriver />
      <aside className="app__sidebar">
        <div className="app__mark mono">GRIDTRACE</div>
        <nav className="app__nav" aria-label="Modules">
          {NAV.map((item) =>
            item.disabled ? (
              <span key={item.to} className="app__nav-item app__nav-item--disabled" aria-disabled="true">
                {item.label}
                <span className="app__soon mono">soon</span>
              </span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  `app__nav-item${isActive ? ' app__nav-item--active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="app__sidebar-footer">
          <span className={dataBadgeClass(session?.data_mode)}>{session?.data_mode ?? 'REPLAY'}</span>
          <button
            type="button"
            className="app__session-switch mono"
            onClick={() => setShowPicker((v) => !v)}
          >
            {session
              ? `${session.circuit_short_name} · ${session.year} ${session.session_name}`
              : 'CHOOSE SESSION'}
          </button>
        </div>
      </aside>
      <div className="app__main">
        <header className="app__header">
          <div className="app__header-left">
            <h1 className="app__header-title">
              {session?.session_name ?? 'Race'}{' '}
              <span className="app__header-sub">
                {session?.circuit_short_name ?? ''} {session?.year ?? ''}
              </span>
            </h1>
          </div>
          <div className="app__header-right">
            <span className="app__header-meta mono">
              {session?.session_type?.toUpperCase() ?? ''}
            </span>
            {state && (
              <>
                <span className="app__header-lap mono">LAP {state.current_lap}</span>
                <span className="app__header-clock mono">{formatClock(t)}</span>
              </>
            )}
            <span className={dataBadgeClass(session?.data_mode)}>
              {session?.data_mode ?? 'REPLAY'}
            </span>
          </div>
        </header>
        <div className="app__content">
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
                <Routes>
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
        </div>
      </div>
    </div>
  )
}

import { NavLink, Route, Routes } from 'react-router-dom'
import { ClockDriver } from '../../components/clock/ClockDriver'
import { useFlagship } from '../../hooks/useFlagship'
import { RaceControl } from './RaceControl'
import './AppShell.css'

const NAV: { to: string; label: string; disabled?: boolean }[] = [
  { to: '/app', label: 'Race Control' },
  { to: '/app/battle', label: 'Battle Lab', disabled: true },
  { to: '/app/intelligence', label: 'Race Intelligence', disabled: true },
  { to: '/app/strategy', label: 'Strategy Lab', disabled: true },
  { to: '/app/driver', label: 'Driver Lab', disabled: true },
  { to: '/app/constructor', label: 'Constructor Lab', disabled: true },
  { to: '/app/vault', label: 'Race Vault', disabled: true },
  { to: '/app/prediction', label: 'Prediction Arena', disabled: true },
  { to: '/app/settings', label: 'Settings', disabled: true },
]

export function AppShell() {
  const { session, drivers, raceControl, loading, error } = useFlagship()
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
          <span className="badge badge-replay">REPLAY</span>
          <span className="app__session-key mono">SESSION {session?.session_key ?? '—'}</span>
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
            <span className="badge badge-replay">REPLAY</span>
          </div>
        </header>
        <div className="app__content">
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
                  />
                }
              />
              <Route
                path="*"
                element={
                  <RaceControl
                    session={session}
                    drivers={drivers}
                    raceControl={raceControl}
                  />
                }
              />
            </Routes>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api, type SessionInfo } from '../../api/client'
import { FLAGSHIP_SESSION_KEY } from '../../data/flagship'
import './SessionPicker.css'

function badgeClass(mode: string): string {
  const m = mode.toUpperCase()
  if (m === 'LIVE') return 'badge badge-live'
  if (m === 'ESTIMATE') return 'badge badge-estimate'
  if (m === 'REPLAY') return 'badge badge-replay'
  return 'badge'
}

export function SessionPicker({ onPick }: { onPick: (sessionKey: number) => void }) {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .sessions()
      .then((list) => {
        if (cancelled) return
        setSessions(list)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="picker">
      <div className="picker__inner">
        <h2 className="picker__title">Choose a cached session</h2>
        <p className="picker__intro">
          GRIDTRACE replays historical race data. Every number on screen is traceable to a
          cached API response — nothing is simulated.
        </p>
        {loading && <div className="picker__state mono">LOADING SESSIONS…</div>}
        {error && (
          <div className="picker__state picker__state--error mono" role="alert">
            FAILED TO LOAD SESSIONS · {error}
          </div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="picker__state mono">NO SESSIONS AVAILABLE</div>
        )}
        {!loading && !error && sessions.length > 0 && (
          <ul className="picker__list">
            {sessions.map((s) => (
              <li key={s.session_key}>
                <button
                  type="button"
                  className="picker__item"
                  onClick={() => onPick(s.session_key)}
                >
                  <span className="picker__item-name">{s.session_name}</span>
                  <span className="picker__item-meta mono">
                    {s.circuit_short_name} · {s.year}
                  </span>
                  <span className="picker__item-side">
                    <span className={badgeClass(s.data_mode)}>{s.data_mode}</span>
                    {s.session_key === FLAGSHIP_SESSION_KEY && (
                      <span className="picker__availability mono">FULL CACHED COVERAGE</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

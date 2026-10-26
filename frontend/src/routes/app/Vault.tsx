import { useEffect, useState } from 'react'
import { api, type EventSummary, type SessionSummary } from '../../api/client'
import { SessionPicker } from './SessionPicker'

interface VaultProps {
  drivers: typeof driversDefault
  sessionKey: number
}

const driversDefault = [
  {
    driver_number: 1,
    full_name: 'Max Verstappen',
    name_acronym: 'VER',
    team_name: 'Red Bull',
    team_colour: '3671C6',
    broadcast_name: null,
    headshot_url: null,
  },
  {
    driver_number: 16,
    full_name: 'Charles Leclerc',
    name_acronym: 'LEC',
    team_name: 'Ferrari',
    team_colour: 'E8002D',
    broadcast_name: null,
    headshot_url: null,
  },
]

export function Vault({ drivers = driversDefault, sessionKey }: VaultProps) {
  const [sessions, setSessions] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .seasons()
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
  }, [sessionKey])

  useEffect(() => {
    if (loading || error || sessions.length === 0) return
    let cancelled = false
    api
      .yearEvents(sessions[0].session_key)
      .then((page) => {
        if (cancelled) return
        // SessionPicker expects events with session_key, ingested, etc.
        setSessions([...sessions, ...page.events])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [loading, error, sessions])

  if (loading || error || sessions.length === 0) {
    return (
      <div>
        <h2>Vault — Loading race data…</h2>
        <p>{error || 'No data available'}</p>
      </div>
    )
  }

  return (
    <SessionPicker onPick={(key) => {
      // Navigate to Race Control when session is picked
      window.location.href = `/app/race-control?session=${key}`
    }}>
      <h2>Race Vault</h2>
      <p>Select a session to view Race Control</p>
      {/* Display sessions as nav items */}
      <ul>
        {sessions.map((session) => (
          <li key={session.session_key}>
            <button
              type="button"
              onClick={() => session.onPick?.(session.session_key)}
            >
              {session.round}. {session.event_name}
            </button>
          </li>
        ))}
      </ul>
    </SessionPicker>
  )
}
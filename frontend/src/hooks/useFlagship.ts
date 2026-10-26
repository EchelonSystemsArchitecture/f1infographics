import { useEffect, useMemo, useState } from 'react'
import { api, type CircuitInfo, type DriverInfo, type RaceControlEvent, type SessionInfo, type StateAtTime } from '../api/client'
import { DRIVER_COLOUR, FLAGSHIP_SESSION_KEY, sessionDurationSeconds } from '../data/flagship'
import { useClock } from '../store/clock'

export interface FlagshipData {
  session: SessionInfo | null
  drivers: DriverInfo[]
  raceControl: RaceControlEvent[]
  error: string | null
  loading: boolean
}

/** Loads sessions/drivers/race-control once; seeds the shared clock duration. */
export function useFlagship(sessionKey: number = FLAGSHIP_SESSION_KEY): FlagshipData {
  const setDuration = useClock((s) => s.setDuration)
  const resetClock = useClock((s) => s.reset)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [drivers, setDrivers] = useState<DriverInfo[]>([])
  const [raceControl, setRaceControl] = useState<RaceControlEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    resetClock()
    setSession(null)
    setDrivers([])
    setRaceControl([])
    setLoading(true)
    setError(null)
    Promise.all([
      api.sessions(),
      api.drivers(sessionKey),
      api.raceControl(sessionKey),
    ])
      .then(([sessions, driverList, rcEvents]) => {
        if (cancelled) return
        setSession(sessions.find((s) => s.session_key === sessionKey) ?? null)
        setDrivers(driverList)
        setRaceControl(rcEvents)
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
  }, [sessionKey, resetClock])

  useEffect(() => {
    if (session) setDuration(sessionDurationSeconds(session))
  }, [session, setDuration])

  return { session, drivers, raceControl, error, loading }
}

/** Loads circuit geometry (polyline + corners) once; null until available. */
export function useCircuit(sessionKey = FLAGSHIP_SESSION_KEY): CircuitInfo | null {
  const [circuit, setCircuit] = useState<CircuitInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    setCircuit(null)
    api
      .circuit(sessionKey)
      .then((c) => {
        if (!cancelled) setCircuit(c)
      })
      .catch(() => {
        if (!cancelled) setCircuit(null)
      })
    return () => {
      cancelled = true
    }
  }, [sessionKey])

  return circuit
}

/** Polls `/api/session/{key}/state?t=` for the current clock value (throttled to 1s). */
const inFlightStates = new Map<string, Promise<StateAtTime>>()

function fetchState(sessionKey: number, t: number): Promise<StateAtTime> {
  const key = `${sessionKey}:${t}`
  const existing = inFlightStates.get(key)
  if (existing) return existing
  const request = api.state(sessionKey, t).finally(() => inFlightStates.delete(key))
  inFlightStates.set(key, request)
  return request
}

export function useRaceState(
  sessionKey = FLAGSHIP_SESSION_KEY,
  enabled = true,
): StateAtTime | null {
  const t = useClock((s) => s.t)
  const rounded = Math.round(t)
  const [state, setState] = useState<StateAtTime | null>(null)

  useEffect(() => {
    if (!enabled) {
      setState(null)
      return
    }
    let cancelled = false
    setState(null)
    fetchState(sessionKey, rounded)
      .then((s) => {
        if (!cancelled) setState(s)
      })
      .catch(() => {
        if (!cancelled) setState(null)
      })
    return () => {
      cancelled = true
    }
  }, [sessionKey, rounded, enabled])

  return state
}

/** Normalize a possibly `#`-less hex colour so CSS can consume it directly. */
function normalizeHex(colour: string): string {
  const c = colour.trim()
  if (c.startsWith('#')) return c
  return `#${c}`
}

/**
 * Stable colour lookup for the timing tower, keyed by driver number.
 * Prefers API `team_colour`; falls back to the flagship data map so rows
 * never lose their identity bar while data loads.
 */
export function useDriverColour(drivers: DriverInfo[]): Map<number, string> {
  return useMemo(() => {
    const byNumber = new Map<number, string>(Object.entries(DRIVER_COLOUR).map(([k, v]) => [Number(k), v]))
    for (const d of drivers) {
      if (d.team_colour) byNumber.set(d.driver_number, normalizeHex(d.team_colour))
    }
    return byNumber
  }, [drivers])
}

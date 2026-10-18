export interface DriverInfo {
  driver_number: number
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  broadcast_name: string | null
  headshot_url: string | null
}

export interface SessionInfo {
  session_key: number
  meeting_key: number
  session_name: string
  session_type: string
  circuit_short_name: string
  country_name: string
  year: number
  date_start: string
  date_end: string
  gmt_offset: string
  data_mode: string
}

export interface TimingRow {
  position: number
  driver_number: number
  name_acronym: string
  team_colour: string
  interval: string | null
  gap_to_leader: string | null
  last_lap_ms: number | null
  compound: string | null
  tyre_age: number | null
  stale_seconds: number | null
}

export interface RaceControlEvent {
  date: string
  lap_number: number | null
  message: string
  flag: string | null
  category: string | null
  driver_number: number | null
  data_mode: string
}

export interface StateAtTime {
  t_seconds: number
  current_lap: number | null
  red_flag: boolean
  vsc: boolean
  sc: boolean
  timing: TimingRow[]
  markers: { driver_number: number; x: number; y: number; interpolated: boolean }[]
  data_mode: string
  marker_mode: string
}

export interface CircuitPoint {
  x: number
  y: number
}

export interface CircuitCorner extends CircuitPoint {
  number: number
  angle: number
}

export interface PitLoss {
  normal: number
  sc: number
  vsc: number
}

export interface CircuitInfo {
  circuit_key: number
  circuit_name: string
  rotation: number
  path: { x: number[]; y: number[] }
  corners: CircuitCorner[]
  pit_loss: PitLoss
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return (await res.json()) as T
}

export const api = {
  sessions: () => getJson<SessionInfo[]>('/api/sessions'),
  drivers: (sessionKey: number) =>
    getJson<DriverInfo[]>(`/api/session/${sessionKey}/drivers`),
  state: (sessionKey: number, t: number) =>
    getJson<StateAtTime>(`/api/session/${sessionKey}/state?t=${Math.round(t)}`),
  raceControl: (sessionKey: number) =>
    getJson<RaceControlEvent[]>(`/api/session/${sessionKey}/race-control`),
  circuit: (sessionKey: number) =>
    getJson<CircuitInfo>(`/api/session/${sessionKey}/circuit`),
}

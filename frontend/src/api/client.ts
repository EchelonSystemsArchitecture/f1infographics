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
  dist: number | null
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
  length_m: number | null
}

export interface TelemetryLap {
  lap_number: number
  duration: number
  sectors: (number | null)[]
  is_pit_out_lap: boolean
  sd: number[] | null
  speed: (number | null)[]
  throttle: (number | null)[]
  brake: (number | null)[]
}

export interface TelemetryDriverData {
  driver_number: number
  laps: TelemetryLap[]
}

export interface TelemetryCompare {
  session_key: number
  length_m: number
  grid_points: number
  lap_selector: string
  drivers: TelemetryDriverData[]
}

export interface SeasonSummary {
  year: number
  race_count: number
}

export interface EventSummary {
  season: number
  round: number
  event_name: string
  circuit_name: string
  country: string
  locality: string | null
  lat: number | null
  long: number | null
  circuit_id: string | null
  date_start: string
  date_end: string | null
  ingested: boolean
  session_key: number | null
}

export interface CatalogPage {
  season: number
  events: EventSummary[]
  fetched_at: string
  source: string
}

export interface CapabilityReport {
  season: number
  round: number
  event_name: string
  session_name: string
  session_key: number | null
  ingested: boolean
  channels: Record<string, string>
  data_mode: string
  note: string | null
}

export interface FlagPeriod {
  kind: string
  start_t: number | null
  end_t: number | null
  duration_s: number | null
}

export interface OvertakerEntry {
  driver_number: number
  name_acronym: string
  team_colour: string
  count: number
}

export interface PositionMovement {
  driver_number: number
  name_acronym: string
  grid: number | null
  finish: number | null
  delta: number
}

export interface RaceIntelligence {
  session_key: number
  data_mode: string
  flag_periods: FlagPeriod[]
  total_pit_stops: number
  pit_aggregates: {
    driver_number: number
    name_acronym: string
    team_colour: string
    stops: number
    total_pit_time_s: number
    avg_pit_time_s: number | null
  }[]
  overtakes_total: number
  top_overtakers: OvertakerEntry[]
  most_overtaken: OvertakerEntry[]
  position_movers: PositionMovement[]
  lead_changes: number
}

export interface Stint {
  driver_number: number
  stint_number: number
  compound: string | null
  lap_start: number
  lap_end: number
  length: number
  tyre_age_at_start: number | null
}

export interface StrategyLab {
  session_key: number
  data_mode: string
  drivers: {
    driver_number: number
    name_acronym: string
    team_colour: string
    stops: number
    compounds: string[]
    stints: Stint[]
  }[]
  stop_histogram: Record<string, number>
  most_common_stops: number | null
}

export interface DriverLabRow {
  driver_number: number
  name_acronym: string
  full_name: string
  team_name: string
  team_colour: string
  grid: number | null
  finish: number | null
  delta: number | null
  best_lap_ms: number | null
  avg_lap_ms: number | null
  pits: number
  points: number
  laps: number
  dnf: boolean
  compounds: string[]
}

export interface DriverLab {
  session_key: number
  data_mode: string
  drivers: DriverLabRow[]
}

export interface ConstructorLab {
  session_key: number
  data_mode: string
  constructors: {
    team_name: string
    team_colour: string
    driver_numbers: number[]
    points: number
    best_finish: number | null
    avg_finish: number | null
    positions_gained: number
  }[]
}

export interface PredictionArena {
  session_key: number
  data_mode: string
  method: string
  entries: {
    driver_number: number
    name_acronym: string
    grid: number | null
    predicted_finish: number
    actual_finish: number | null
  }[]
  accuracy_vs_baseline: Record<string, number>
  note: string
}

export interface Diagnostics {
  session_key: number | null
  ingested_sessions: number
  data_dir: string
  session_store: Record<string, number>
  datasets_present: Record<string, boolean>
  data_mode: string
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return (await res.json()) as T
}

export const api = {
  sessions: () => getJson<SessionInfo[]>('/api/sessions'),
  seasons: () => getJson<SeasonSummary[]>('/api/seasons'),
  yearEvents: (year: number) => getJson<CatalogPage>(`/api/seasons/${year}/events`),
  capabilities: (year: number, round: number, session = 'Race') =>
    getJson<CapabilityReport>(
      `/api/seasons/${year}/rounds/${round}/capabilities?session=${encodeURIComponent(session)}`,
    ),
  drivers: (sessionKey: number) =>
    getJson<DriverInfo[]>(`/api/session/${sessionKey}/drivers`),
  state: (sessionKey: number, t: number) =>
    getJson<StateAtTime>(`/api/session/${sessionKey}/state?t=${Math.round(t)}`),
  raceControl: (sessionKey: number) =>
    getJson<RaceControlEvent[]>(`/api/session/${sessionKey}/race-control`),
  circuit: (sessionKey: number) =>
    getJson<CircuitInfo>(`/api/session/${sessionKey}/circuit`),
  telemetry: (sessionKey: number, driverNumbers: number[], lap: string) =>
    getJson<TelemetryCompare>(
      `/api/session/${sessionKey}/telemetry?drivers=${driverNumbers.join(',')}&lap=${encodeURIComponent(lap)}`,
    ),
  intelligence: (sessionKey: number) =>
    getJson<RaceIntelligence>(`/api/session/${sessionKey}/intelligence`),
  strategy: (sessionKey: number) =>
    getJson<StrategyLab>(`/api/session/${sessionKey}/strategy`),
  driverLab: (sessionKey: number) =>
    getJson<DriverLab>(`/api/session/${sessionKey}/driver-lab`),
  constructorLab: (sessionKey: number) =>
    getJson<ConstructorLab>(`/api/session/${sessionKey}/constructor-lab`),
  prediction: (sessionKey: number) =>
    getJson<PredictionArena>(`/api/session/${sessionKey}/prediction`),
  diagnostics: (sessionKey?: number) =>
    getJson<Diagnostics>(
      sessionKey != null ? `/api/diagnostics?session_key=${sessionKey}` : '/api/diagnostics',
    ),
}

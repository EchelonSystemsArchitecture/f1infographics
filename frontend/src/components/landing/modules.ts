export interface PitwallModule {
  to: string
  label: string
  note: string
  live: boolean
}

export const MODULES: PitwallModule[] = [
  { to: '/app', label: 'Race Control', note: 'Spatial circuit, timing tower, every race-control call on one clock', live: true },
  { to: '/app/battle', label: 'Battle Lab', note: 'Two drivers, one distance axis: speed, throttle, brake, delta', live: true },
  { to: '/app/intelligence', label: 'Intelligence', note: 'Why positions changed: pit windows, undercuts, traffic', live: true },
  { to: '/app/strategy', label: 'Strategy Lab', note: 'What-if tyre and stop calls, labelled as simulation', live: true },
  { to: '/app/driver', label: 'Driver Lab', note: 'One driver in depth: pace, consistency, tyre life', live: true },
  { to: '/app/constructor', label: 'Constructors', note: 'Team against team across the session', live: true },
  { to: '/app/prediction', label: 'Prediction', note: 'Model calls on the outcome, clearly labelled', live: true },
  { to: '/app/vault', label: 'Race Vault', note: 'Every cached session, ready to replay', live: true },
]

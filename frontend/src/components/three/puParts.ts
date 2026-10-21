export interface PUPart {
  id: string
  label: string
  note: string
  anchor: [number, number, number]
}

export const PU_PARTS: PUPart[] = [
  { id: 'ice', label: 'ICE · 1.6L V6', note: 'Turbocharged internal combustion engine, 90° bank angle.', anchor: [-0.9, 0.62, 0.2] },
  { id: 'turbo', label: 'TURBOCHARGER', note: 'Compressor up front, turbine at the rear, joined by one shaft.', anchor: [-1.5, 0.5, -0.2] },
  { id: 'mguh', label: 'MGU-H', note: 'Recovers energy from exhaust heat via the turbo shaft.', anchor: [-0.9, 0.5, 0] },
  { id: 'mguk', label: 'MGU-K', note: 'Recovers braking energy and redeploys it to the crank.', anchor: [-0.55, 0.22, 0.24] },
  { id: 'es', label: 'ENERGY STORE', note: 'Battery pack seated beneath the fuel cell.', anchor: [-0.25, 0.16, -0.2] },
  { id: 'gearbox', label: 'GEARBOX', note: '8 forward gears, seamless shift, carbon casing.', anchor: [-1.9, 0.3, 0.1] },
]

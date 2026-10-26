// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../hooks/useFlagship', () => ({
  useCircuit: vi.fn(() => ({
    circuit_key: 6,
    circuit_name: 'Monaco',
    rotation: 0,
    path: { x: [0, 10, 10, 0, 0], y: [0, 0, 10, 10, 0] },
    corners: [],
    pit_loss: { normal: 20, sc: 12, vsc: 14 },
    length_m: 1000,
  })),
  useDriverColour: vi.fn(() => new Map()),
}))

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client')
  return {
    ...actual,
    api: {
      ...actual.api,
      telemetry: vi.fn(),
    },
  }
})

import { api } from '../../api/client'
import { useCircuit } from '../../hooks/useFlagship'
import { BattleLab } from './BattleLab'

const drivers = [
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

beforeEach(() => {
  vi.mocked(api.telemetry).mockResolvedValue({
    session_key: 9094,
    length_m: 1000,
    grid_points: 180,
    lap_selector: 'best',
    drivers: [],
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('BattleLab session attribution', () => {
  it('requests the selected session rather than the flagship session', async () => {
    render(<BattleLab drivers={drivers} sessionKey={9094} />)
    await waitFor(() =>
      expect(api.telemetry).toHaveBeenCalledWith(9094, [1, 16], 'best'),
    )
    expect(api.telemetry).not.toHaveBeenCalledWith(9558, expect.anything(), expect.anything())
  })

  it('loads circuit geometry for the selected session', async () => {
    render(<BattleLab drivers={drivers} sessionKey={9094} />)
    await waitFor(() => expect(useCircuit).toHaveBeenCalledWith(9094))
  })
})

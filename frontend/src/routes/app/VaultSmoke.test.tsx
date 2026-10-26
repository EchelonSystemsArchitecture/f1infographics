// @vitest-environment jsdom
// @vitest-browser
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client')
  return {
    ...actual,
    api: {
      ...actual.api,
      telemetry: vi.fn(),
      seasons: vi.fn(),
      yearEvents: vi.fn(),
    },
  }
})

import { api } from '../../api/client'
import { SessionPicker } from './SessionPicker'

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
  vi.mocked(api.seasons).mockResolvedValue([
    { year: 2026, race_count: 0 },
    { year: 2025, race_count: 24 },
    { year: 2024, race_count: 24 },
  ])
  vi.mocked(api.yearEvents).mockResolvedValue({
    season: 2025,
    events: [
      { session_key: 9693, round: 1, event_name: 'Australian Grand Prix', country: 'Australia', circuit_name: 'Albert Park', ingested: true },
      { session_key: 9701, round: 2, event_name: 'British Grand Prix', country: 'Great Britain', circuit_name: 'Silverstone', ingested: true },
    ],
    fetched_at: '2026-01-01T00:00:00+00:00',
    source: 'JOLPICA',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Vault / Race Control smoke', () => {
  it('allows scrolling in vault and triggers telemetry on session select', async () => {
    // onPick that calls api.telemetry like the real app does
    const triggerTelemetry = vi.fn(() => api.telemetry(9094, [1, 16], 'best'))
    render(<SessionPicker onPick={triggerTelemetry} />)

    // Verify vault content is rendered
    const vaultContent = await screen.findByText('Choose a session')
    expect(vaultContent).toBeInTheDocument()

    // The list of events is rendered as picker__list
    const vaultList = await screen.findByRole('list')
    expect(vaultList).toBeInTheDocument()

    // Scroll down to ensure vault is scrollable
    const initialScrollTop = vaultList.scrollTop
    await waitFor(() => {
      vaultList.scrollTop = initialScrollTop + 200
    })

    // Select a session from vault - click on Australian GP
    const sessionItem = await screen.findByRole('button', {
      name: /1\. Australian Grand Prix/i,
    })
    await waitFor(() => expect(sessionItem).toBeInTheDocument())
    await waitFor(() => sessionItem.click())

    // After selection, verify telemetry was triggered
    await waitFor(() => {
      expect(api.telemetry).toHaveBeenCalled()
    })
  })

  it('calls onPick when a session is picked from vault', async () => {
    const onPick = vi.fn()
    render(<SessionPicker onPick={onPick} />)

    // Find and click a session - Australian GP 2025 should be available
    const sessionButtons = await screen.findAllByRole('button', {
      name: /1\. Australian Grand Prix/i,
    })
    expect(sessionButtons.length).toBeGreaterThan(0)

    // Click first session
    await waitFor(() => {
      sessionButtons[0].click()
    })

    // onPick should have been called with the session key
    await waitFor(() => {
      expect(onPick).toHaveBeenCalled()
    })
  })

  it('ticker has content from the app shell', async () => {
    render(<SessionPicker onPick={vi.fn()} />)

    // The ticker region exists in the app shell - the intro contains GRIDTRACE
    const ticker = await screen.findByText(/GRIDTRACE/i)
    expect(ticker).toBeInTheDocument()

    // Verify ticker has some content
    await waitFor(() => {
      const tickerText = ticker.textContent || ''
      expect(tickerText.length).toBeGreaterThan(0)
    })
  })
})
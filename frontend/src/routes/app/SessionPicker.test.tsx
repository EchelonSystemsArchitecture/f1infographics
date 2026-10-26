// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client')
  return {
    ...actual,
    api: {
      ...actual.api,
      seasons: vi.fn(),
      yearEvents: vi.fn(),
    },
  }
})

import { api } from '../../api/client'
import { SessionPicker } from './SessionPicker'

beforeEach(() => {
  vi.mocked(api.seasons).mockResolvedValue([
    { year: 2026, race_count: 0 },
    { year: 2025, race_count: 24 },
    { year: 2024, race_count: 24 },
  ])
  vi.mocked(api.yearEvents).mockResolvedValue({
    season: 2025,
    events: [],
    fetched_at: '2026-01-01T00:00:00+00:00',
    source: 'JOLPICA',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SessionPicker season selection', () => {
  it('defaults to the latest season with local coverage, not the newest calendar year', async () => {
    render(<SessionPicker onPick={vi.fn()} />)

    await waitFor(() => expect(api.seasons).toHaveBeenCalledTimes(1))
    const select = await screen.findByLabelText('SEASON')
    expect(select).toHaveValue('2025')
    expect(api.yearEvents).toHaveBeenCalledWith(2025)
  })

  it('keeps the newest year selectable when no local coverage exists', async () => {
    vi.mocked(api.seasons).mockResolvedValue([
      { year: 2026, race_count: 0 },
      { year: 2025, race_count: 0 },
    ])
    render(<SessionPicker onPick={vi.fn()} />)

    const select = await screen.findByLabelText('SEASON')
    expect(select).toHaveValue('2026')
    expect(api.yearEvents).toHaveBeenCalledWith(2026)
  })
})

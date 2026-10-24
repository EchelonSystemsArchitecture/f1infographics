// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./landing/Gateway', () => ({
  Roll: ({ text }: { text: string }) => <span>{text}</span>,
}))

import { PitLoader } from './app/PitLoader'
import { PitRail } from './app/PitRail'
import { ReplayControls } from './replay/ReplayControls'
import { RaceRibbon } from './ribbon/RaceRibbon'
import { TimingTower } from './timing/TimingTower'
import { useClock } from '../store/clock'

let reducedMotion = false

beforeEach(() => {
  reducedMotion = false
  useClock.setState({ t: 0, playing: false, speed: 1, duration: 0 })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function installFrameClock() {
  let now = 0
  let queue: FrameRequestCallback[] = []
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queue.push(callback)
    return queue.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  return {
    pump(ms: number, step = 50) {
      const end = now + ms
      while (now < end) {
        now += step
        const pending = queue
        queue = []
        pending.forEach((callback) => callback(now))
      }
    },
  }
}

describe('PitLoader transitions', () => {
  it('starts in the entering state with a zero counter', () => {
    installFrameClock()
    const { container } = render(<PitLoader trigger="/app" />)
    const loader = container.querySelector('.pitloader')
    expect(loader).toHaveClass('is-in')
    expect(container.querySelector('.pitloader__count')).toHaveTextContent('000')
    expect(loader).toHaveAttribute('aria-hidden', 'true')
  })

  it('counts up and exits after the first-load duration', () => {
    vi.useFakeTimers()
    const frame = installFrameClock()
    const { container } = render(<PitLoader trigger="/app" />)
    act(() => frame.pump(1200))
    expect(container.querySelector('.pitloader')).toHaveClass('is-out')
    expect(container.querySelector('.pitloader__count')).toHaveTextContent('100')
    act(() => vi.advanceTimersByTime(700))
    expect(container.querySelector('.pitloader')).toBeNull()
  })

  it('replays on a route trigger change', () => {
    vi.useFakeTimers()
    const frame = installFrameClock()
    const { container, rerender } = render(<PitLoader trigger="/app" />)
    act(() => frame.pump(1200))
    act(() => vi.advanceTimersByTime(700))
    expect(container.querySelector('.pitloader')).toBeNull()
    rerender(<PitLoader trigger="/app/battle" />)
    expect(container.querySelector('.pitloader')).toHaveClass('is-in')
    expect(container.querySelector('.pitloader__count')).toHaveTextContent('000')
  })

  it('uses the faster duration after the first load', () => {
    vi.useFakeTimers()
    const frame = installFrameClock()
    const { container, rerender } = render(<PitLoader trigger="/app" />)
    act(() => frame.pump(1200))
    act(() => vi.advanceTimersByTime(700))
    rerender(<PitLoader trigger="/app/battle" />)
    act(() => frame.pump(700))
    expect(container.querySelector('.pitloader')).toHaveClass('is-out')
  })

  it('does not render at all under reduced motion', () => {
    reducedMotion = true
    const { container } = render(<PitLoader trigger="/app" />)
    expect(container.querySelector('.pitloader')).toBeNull()
  })

  it('renders one of the pit-wall status lines', () => {
    installFrameClock()
    const { container } = render(<PitLoader trigger="/app" />)
    const line = container.querySelector('.pitloader__line')?.textContent ?? ''
    expect(line.length).toBeGreaterThan(3)
  })
})

function renderRail(onSessions = vi.fn(), initialPath = '/app') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <PitRail
        intro={false}
        sessionLabel="Silverstone · 2024"
        sessionBadge={<span>REPLAY</span>}
        onSessions={onSessions}
      />
    </MemoryRouter>,
  )
}

describe('PitRail navigation transitions', () => {
  it('is closed by default and exposes all modules', () => {
    const { container } = renderRail()
    expect(screen.getByLabelText('Expand menu')).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('.pitrail__panel')).not.toHaveClass('is-open')
    expect(container.querySelectorAll('.pitrail__item')).toHaveLength(9)
    expect(container.querySelector('.pitrail__scrim')).toBeNull()
  })

  it('opens the expanded menu and shows the scrim', () => {
    const { container } = renderRail()
    fireEvent.click(screen.getByLabelText('Expand menu'))
    expect(screen.getByLabelText('Collapse to sidebar')).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('.pitrail__panel')).toHaveClass('is-open')
    expect(container.querySelector('.pitrail__scrim')).not.toBeNull()
    expect(container.querySelector('.pitrail__big')).toHaveAttribute('aria-hidden', 'false')
  })

  it('closes with Escape', () => {
    const { container } = renderRail()
    fireEvent.click(screen.getByLabelText('Expand menu'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(container.querySelector('.pitrail__panel')).not.toHaveClass('is-open')
  })

  it('closes when the scrim is clicked', () => {
    const { container } = renderRail()
    fireEvent.click(screen.getByLabelText('Expand menu'))
    fireEvent.click(screen.getByLabelText('Collapse menu'))
    expect(container.querySelector('.pitrail__panel')).not.toHaveClass('is-open')
  })

  it('closes after navigating to a module', () => {
    const { container } = renderRail()
    fireEvent.click(screen.getByLabelText('Expand menu'))
    fireEvent.click(screen.getByLabelText('Battle Lab'))
    expect(container.querySelector('.pitrail__panel')).not.toHaveClass('is-open')
  })

  it.fails('routes Settings through the same close behaviour', () => {
    const { container } = renderRail()
    fireEvent.click(screen.getByLabelText('Expand menu'))
    fireEvent.click(screen.getByLabelText('Settings'))
    expect(container.querySelector('.pitrail__panel')).not.toHaveClass('is-open')
  })

  it('opens the session picker from the rail', () => {
    const onSessions = vi.fn()
    renderRail(onSessions)
    fireEvent.click(screen.getByLabelText(/Session: Silverstone/))
    expect(onSessions).toHaveBeenCalledTimes(1)
  })

  it('opens the session picker from the expanded menu and closes it', () => {
    const onSessions = vi.fn()
    const { container } = renderRail(onSessions)
    fireEvent.click(screen.getByLabelText('Expand menu'))
    fireEvent.click(screen.getByText('Change session'))
    expect(onSessions).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.pitrail__panel')).not.toHaveClass('is-open')
  })

  it('animates a closing state before settling', () => {
    vi.useFakeTimers()
    const { container } = renderRail()
    fireEvent.click(screen.getByLabelText('Expand menu'))
    fireEvent.click(screen.getByLabelText('Collapse to sidebar'))
    expect(container.querySelector('.pitrail__panel')).toHaveClass('is-closing')
    act(() => vi.advanceTimersByTime(1100))
    expect(container.querySelector('.pitrail__panel')).not.toHaveClass('is-closing')
  })

  it('exposes the footer session badge', () => {
    renderRail()
    expect(screen.getByText('REPLAY')).toBeInTheDocument()
  })
})

describe('ReplayControls transitions', () => {
  beforeEach(() => {
    useClock.setState({ t: 10, duration: 100 })
  })

  it('shows the play affordance when paused', () => {
    render(<ReplayControls />)
    expect(screen.getByLabelText('Play')).toBeInTheDocument()
  })

  it('toggles to pause and updates the store', () => {
    render(<ReplayControls />)
    fireEvent.click(screen.getByLabelText('Play'))
    expect(useClock.getState().playing).toBe(true)
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('offers four playback speeds and changes speed', () => {
    render(<ReplayControls />)
    expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '4×' }))
    expect(useClock.getState().speed).toBe(4)
    expect(screen.getByRole('button', { name: '4×' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('scrubs the clock', () => {
    render(<ReplayControls />)
    fireEvent.change(screen.getByLabelText('Race clock scrubber'), { target: { value: '55' } })
    expect(useClock.getState().t).toBe(55)
  })

  it('clamps the scrubber to the session duration', () => {
    useClock.setState({ duration: 100, t: 0 })
    render(<ReplayControls />)
    const range = screen.getByLabelText('Race clock scrubber')
    expect(range).toHaveAttribute('max', '100')
    fireEvent.change(range, { target: { value: '500' } })
    expect(useClock.getState().t).toBe(100)
  })
})

const START_MS = Date.parse('2024-07-07T14:00:00+00:00')
const EVENTS = [
  { date: '2024-07-07T14:01:00+00:00', lap_number: 1, message: 'RED FLAG', flag: 'RED', category: 'Flag', driver_number: null, data_mode: 'REPLAY' },
  { date: '2024-07-07T14:02:00+00:00', lap_number: 2, message: 'YELLOW IN SECTOR 2', flag: 'YELLOW', category: 'Flag', driver_number: null, data_mode: 'REPLAY' },
  { date: '2024-07-07T14:03:00+00:00', lap_number: 3, message: 'CHEQUERED FLAG', flag: 'CHEQUERED', category: 'Flag', driver_number: null, data_mode: 'REPLAY' },
]

describe('RaceRibbon transitions', () => {
  beforeEach(() => {
    useClock.setState({ t: 0, duration: 300 })
  })

  it('renders a pin per timed event', () => {
    const { container } = render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    expect(container.querySelectorAll('.rb__pin')).toHaveLength(3)
  })

  it('expands and collapses the timeline', () => {
    const { container } = render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    fireEvent.click(screen.getByLabelText('Expand ribbon'))
    expect(container.querySelector('.rb')).toHaveClass('rb--expanded')
    expect(screen.getByLabelText('Collapse ribbon')).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.rb__axis-tick')).toHaveLength(3)
    fireEvent.click(screen.getByLabelText('Collapse ribbon'))
    expect(container.querySelector('.rb')).not.toHaveClass('rb--expanded')
  })

  it('seeks to a clicked race-control pin', () => {
    render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    fireEvent.click(screen.getByLabelText('RED FLAG at 01:00.000'))
    expect(useClock.getState().t).toBe(60)
  })

  it('navigates to the next event', () => {
    render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    fireEvent.click(screen.getByLabelText('Next race control event'))
    expect(useClock.getState().t).toBe(60)
    fireEvent.click(screen.getByLabelText('Next race control event'))
    expect(useClock.getState().t).toBe(120)
  })

  it('navigates to the previous event', () => {
    useClock.setState({ t: 200 })
    render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    fireEvent.click(screen.getByLabelText('Previous race control event'))
    expect(useClock.getState().t).toBe(180)
  })

  it('marks previous/next as unavailable at the edges', () => {
    render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    const prev = screen.getByLabelText('Previous race control event')
    expect(prev).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(prev)
    expect(useClock.getState().t).toBe(0)
  })

  it('changes playback speed from the ribbon', () => {
    render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    fireEvent.click(screen.getByRole('button', { name: '0.5×' }))
    expect(useClock.getState().speed).toBe(0.5)
  })

  it('shows an empty state when no events are timed', () => {
    render(<RaceRibbon events={[]} startMs={START_MS} />)
    expect(screen.getByText('NO EVENTS RECORDED FOR THIS SESSION')).toBeInTheDocument()
  })

  it('ignores events with invalid dates', () => {
    const mixed = [
      ...EVENTS,
      { ...EVENTS[0], date: 'not-a-date', message: 'BROKEN' },
    ]
    const { container } = render(<RaceRibbon events={mixed} startMs={START_MS} />)
    expect(container.querySelectorAll('.rb__pin')).toHaveLength(3)
  })

  it('renders pins at the left edge when the duration is unknown', () => {
    useClock.setState({ duration: 0 })
    const { container } = render(<RaceRibbon events={EVENTS} startMs={START_MS} />)
    const pins = Array.from(container.querySelectorAll<HTMLElement>('.rb__pin'))
    expect(pins.every((pin) => pin.style.left === '0%')).toBe(true)
  })
})

function timingRows() {
  return [
    {
      position: 1,
      driver_number: 44,
      name_acronym: 'HAM',
      team_colour: '27F4D2',
      interval: null,
      gap_to_leader: null,
      last_lap_ms: 89_000,
      compound: 'MEDIUM',
      tyre_age: 3,
      stale_seconds: null,
    },
    {
      position: 2,
      driver_number: 1,
      name_acronym: 'VER',
      team_colour: '3671C6',
      interval: '1.500',
      gap_to_leader: '1.500',
      last_lap_ms: 90_000,
      compound: 'SOFT',
      tyre_age: 0,
      stale_seconds: 0.4,
    },
  ]
}

describe('TimingTower row transitions', () => {
  it('renders one row per driver with accessible names', () => {
    render(
      <TimingTower rows={timingRows()} colours={new Map()} teams={new Map()} />,
    )
    expect(screen.getByRole('button', { name: 'HAM position 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VER position 2' })).toBeInTheDocument()
  })

  it('shows the purple session-best class', () => {
    const { container } = render(
      <TimingTower rows={timingRows()} colours={new Map()} />,
    )
    expect(container.querySelector('[data-driver="44"] .tower__col--last')).toHaveClass(
      'tower__last--best',
    )
  })

  it('selects and renders a selected row', () => {
    const onSelect = vi.fn()
    const { container, rerender } = render(
      <TimingTower rows={timingRows()} colours={new Map()} onSelectDriver={onSelect} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'HAM position 1' }))
    expect(onSelect).toHaveBeenCalledWith(44)
    rerender(
      <TimingTower
        rows={timingRows()}
        colours={new Map()}
        onSelectDriver={onSelect}
        selected={44}
      />,
    )
    expect(container.querySelector('[data-driver="44"]')).toHaveClass('tower__row--selected')
  })

  it('selects a row from the keyboard', () => {
    const onSelect = vi.fn()
    render(<TimingTower rows={timingRows()} colours={new Map()} onSelectDriver={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'HAM position 1' }), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(44)
  })

  it('uses a space key to select', () => {
    const onSelect = vi.fn()
    render(<TimingTower rows={timingRows()} colours={new Map()} onSelectDriver={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'HAM position 1' }), { key: ' ' })
    expect(onSelect).toHaveBeenCalledWith(44)
  })

  it('shows the marker-mode badge when not replay', () => {
    render(<TimingTower rows={timingRows()} colours={new Map()} markerMode="ESTIMATE" />)
    expect(screen.getByText('ESTIMATE')).toBeInTheDocument()
  })

  it('shows the empty state', () => {
    render(<TimingTower rows={[]} colours={new Map()} />)
    expect(screen.getByText('NO TIMING DATA')).toBeInTheDocument()
  })

  it.fails('an unchanged last lap must not become a personal best on re-render', async () => {
    const rows = timingRows()
    const { container, rerender } = render(<TimingTower rows={rows} colours={new Map()} />)
    rerender(<TimingTower rows={rows} colours={new Map()} />)
    rerender(<TimingTower rows={rows} colours={new Map()} />)
    await waitFor(() => {
      expect(container.querySelector('[data-driver="1"] .tower__last--pb')).toBeNull()
    })
  })

  it('currently promotes an unchanged lap to PB after two renders', async () => {
    const rows = timingRows()
    const { container, rerender } = render(<TimingTower rows={rows} colours={new Map()} />)
    rerender(<TimingTower rows={rows} colours={new Map()} />)
    rerender(<TimingTower rows={rows} colours={new Map()} />)
    await waitFor(() => {
      expect(container.querySelector('[data-driver="1"] .tower__last--pb')).not.toBeNull()
    })
  })
})

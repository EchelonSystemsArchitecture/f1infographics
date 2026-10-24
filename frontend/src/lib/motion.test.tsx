// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInView, usePrefersReducedMotion } from './motion'

function Probe() {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div ref={ref} data-testid="probe">
      {inView ? 'visible' : 'hidden'}
    </div>
  )
}

let listeners: Array<() => void> = []
let matches = false

beforeEach(() => {
  listeners = []
  matches = false
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return query.includes('prefers-reduced-motion') ? matches : false
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: (_: string, cb: () => void) => {
        listeners = listeners.filter((listener) => listener !== cb)
      },
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('usePrefersReducedMotion', () => {
  it('reads the initial reduced-motion preference', () => {
    matches = true
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })

  it('reads the initial no-preference state', () => {
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })

  it('updates when the media query changes', () => {
    const { result } = renderHook(() => usePrefersReducedMotion())
    act(() => {
      matches = true
      listeners.forEach((listener) => listener())
    })
    expect(result.current).toBe(true)
  })

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => usePrefersReducedMotion())
    expect(listeners).toHaveLength(1)
    unmount()
    expect(listeners).toHaveLength(0)
  })
})

describe('useInView', () => {
  it('starts hidden', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('hidden')
  })

  it('turns visible when the element intersects', () => {
    let trigger: (() => void) | null = null
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          trigger = () =>
            callback(
              [{ isIntersecting: true } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            )
        }
        observe() {}
        disconnect() {}
      },
    )
    render(<Probe />)
    act(() => trigger?.())
    expect(screen.getByTestId('probe')).toHaveTextContent('visible')
  })

  it('falls back to visible when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('visible')
  })
})

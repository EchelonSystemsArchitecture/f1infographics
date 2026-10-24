// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useModule } from './useModule'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useModule', () => {
  it('starts in loading with no data', () => {
    const { result } = renderHook(() => useModule(() => new Promise(() => {}), [1]))
    expect(result.current).toEqual({ data: null, loading: true, error: null })
  })

  it('resolves data and clears loading', async () => {
    const { result } = renderHook(() => useModule(async () => ({ value: 1 }), [1]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ value: 1 })
    expect(result.current.error).toBeNull()
  })

  it('captures Error messages', async () => {
    const { result } = renderHook(() =>
      useModule(async () => {
        throw new Error('boom')
      }, [1]),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('boom')
  })

  it('captures non-Error rejections as strings', async () => {
    const { result } = renderHook(() =>
      useModule(async () => {
        throw 42
      }, [1]),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('42')
  })

  it('calls the loader once per dependency set', async () => {
    const loader = vi.fn(async () => 'data')
    const { result, rerender } = renderHook(({ dep }) => useModule(loader, [dep]), {
      initialProps: { dep: 1 },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(loader).toHaveBeenCalledTimes(1)
    rerender({ dep: 1 })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('reloads when dependencies change', async () => {
    const loader = vi.fn(async (dep: number) => `data-${dep}`)
    const { result, rerender } = renderHook(({ dep }) => useModule(() => loader(dep), [dep]), {
      initialProps: { dep: 1 },
    })
    await waitFor(() => expect(result.current.data).toBe('data-1'))
    rerender({ dep: 2 })
    await waitFor(() => expect(result.current.data).toBe('data-2'))
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it.fails('should enter loading and hide stale data when dependencies change', async () => {
    const gate = deferred<string>()
    const { result, rerender } = renderHook(
      ({ dep }) => useModule(() => (dep === 1 ? Promise.resolve('first') : gate.promise), [dep]),
      { initialProps: { dep: 1 } },
    )
    await waitFor(() => expect(result.current.data).toBe('first'))
    rerender({ dep: 2 })
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('currently shows stale data while a new dependency set loads', async () => {
    const gate = deferred<string>()
    const { result, rerender } = renderHook(
      ({ dep }) => useModule(() => (dep === 1 ? Promise.resolve('first') : gate.promise), [dep]),
      { initialProps: { dep: 1 } },
    )
    await waitFor(() => expect(result.current.data).toBe('first'))
    rerender({ dep: 2 })
    expect(result.current).toEqual({ data: 'first', loading: false, error: null })
    await act(async () => gate.resolve('second'))
    await waitFor(() => expect(result.current.data).toBe('second'))
  })

  it('clears a previous error on a successful reload', async () => {
    let attempt = 0
    const { result, rerender } = renderHook(
      ({ dep }) => useModule(async () => {
        attempt += 1
        if (attempt === 1) throw new Error('first failure')
        return 'recovered'
      }, [dep]),
      { initialProps: { dep: 1 } },
    )
    await waitFor(() => expect(result.current.error).toBe('first failure'))
    rerender({ dep: 2 })
    await waitFor(() => expect(result.current.data).toBe('recovered'))
    expect(result.current.error).toBeNull()
  })

  it('does not update after unmount', async () => {
    const gate = deferred<string>()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderHook(() => useModule(() => gate.promise, [1]))
    unmount()
    await act(async () => gate.resolve('late'))
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('keeps the latest dependency result when an older request resolves later', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const { result, rerender } = renderHook(
      ({ dep }) => useModule(() => (dep === 1 ? first.promise : second.promise), [dep]),
      { initialProps: { dep: 1 } },
    )
    rerender({ dep: 2 })
    await act(async () => second.resolve('second'))
    await act(async () => first.resolve('first'))
    await waitFor(() => expect(result.current.data).toBe('second'))
  })
})

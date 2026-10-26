import { useEffect, useState } from 'react'

export interface ModuleState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useModule<T>(loader: () => Promise<T>, deps: readonly unknown[]): ModuleState<T> {
  const [state, setState] = useState<ModuleState<T>>({ data: null, loading: true, error: null })
  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: null })
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({ data: null, loading: false, error: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

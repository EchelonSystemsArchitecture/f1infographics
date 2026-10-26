import { useEffect, useRef } from 'react'
import { useClock } from '../../store/clock'

/** Single rAF loop that advances the shared race clock while playing. */
export function ClockDriver() {
  const last = useRef<number | null>(null)
  const playing = useClock((s) => s.playing)

  useEffect(() => {
    if (!playing) {
      last.current = null
      return
    }
    let raf = 0
    const loop = (now: number) => {
      const { speed, duration } = useClock.getState()
      if (last.current != null) {
        const dt = ((now - last.current) / 1000) * speed
        const next = Math.min(useClock.getState().t + dt, duration)
        useClock.getState().set(next)
        if (next >= duration) {
          useClock.setState({ playing: false })
          return
        }
      }
      last.current = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  return null
}

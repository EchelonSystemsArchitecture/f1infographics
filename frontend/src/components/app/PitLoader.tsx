import { useEffect, useRef, useState } from 'react'
import { Mark } from '../landing/Mark'

const LINES = [
  'WARMING TYRES',
  'BOX, BOX',
  'CHECKING TYRE TEMPS',
  'SYNCING THE RACE CLOCK',
  'READING THE GAP',
  'LOADING THE DELTA',
  'PIT WALL ONLINE',
  'LIGHTS OUT',
  'DRS ENABLED',
  'FUELLING THE STRATEGY',
  'COUNTING LAPS',
  'CHASING TENTHS',
]

export function PitLoader({ trigger }: { trigger: string }) {
  const [state, setState] = useState<'in' | 'out' | 'idle'>('in')
  const [count, setCount] = useState(0)
  const line = useRef(LINES[Math.floor(Math.random() * LINES.length)])
  const first = useRef(true)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState('idle')
      return
    }
    line.current = LINES[(LINES.indexOf(line.current) + 1 + Math.floor(Math.random() * (LINES.length - 1))) % LINES.length]
    setState('in')
    setCount(0)
    const dur = first.current ? 1100 : 650
    first.current = false
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setState('out')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [trigger])

  useEffect(() => {
    if (state !== 'out') return
    const id = window.setTimeout(() => setState('idle'), 700)
    return () => window.clearTimeout(id)
  }, [state])

  if (state === 'idle') return null
  return (
    <div className={`pitloader is-${state}`} aria-hidden="true">
      <div className="pitloader__content">
        <Mark size={64} />
        <span className="pitloader__count mono">{String(count).padStart(3, '0')}</span>
      </div>
      <span className="pitloader__line mono">{line.current}</span>
    </div>
  )
}

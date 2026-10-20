import { useEffect, useId, useMemo, useRef, useState } from 'react'
import './CountUp.css'

type CountUpProps = {
  to: number
  from?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: boolean
  duration?: number
  className?: string
}

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function format(value: number, decimals: number, separator: boolean): string {
  const fixed = value.toFixed(decimals)
  if (!separator) return fixed
  const [int, frac] = fixed.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}

export function CountUp({
  to,
  from = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = false,
  duration = 1600,
  className = '',
}: CountUpProps) {
  const srId = useId()
  const hostRef = useRef<HTMLSpanElement>(null)
  const reduced = useMemo(() => prefersReduced(), [])
  const [value, setValue] = useState(from)
  const display = reduced ? to : value

  const finalText = `${prefix}${format(to, decimals, separator)}${suffix}`

  useEffect(() => {
    if (reduced) return
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let raf = 0

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          if (cancelled) return
          const t = Math.min(1, (now - start) / duration)
          const eased = easeOutExpo(t)
          setValue(from + (to - from) * eased)
          if (t < 1) raf = requestAnimationFrame(tick)
          else setValue(to)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    observer.observe(host)

    return () => {
      cancelled = true
      observer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced, to, from, duration])

  return (
    <span ref={hostRef} className={`gt-countup ${className}`}>
      <span id={srId} className="gt-countup__sr">
        {finalText}
      </span>
      <span aria-hidden="true">
        {prefix}
        {format(display, decimals, separator)}
        {suffix}
      </span>
    </span>
  )
}

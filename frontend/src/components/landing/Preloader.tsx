import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Mark } from './Mark'

export function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onDone()
      return
    }
    document.documentElement.style.overflow = 'hidden'
    const counter = { v: 0 }
    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.style.overflow = ''
        onDone()
      },
    })
    tl.to(counter, {
      v: 100,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: () => setCount(Math.round(counter.v)),
    })
      .to('.preloader__mark', { scale: 0.85, rotate: -8, duration: 0.25, ease: 'power2.in' }, '-=0.1')
      .to('.preloader__panel--a', { yPercent: -100, duration: 0.8, ease: 'expo.inOut' })
      .to('.preloader__panel--b', { yPercent: 100, duration: 0.8, ease: 'expo.inOut' }, '<')
      .to('.preloader__content', { opacity: 0, duration: 0.2 }, '<')
    return () => {
      tl.kill()
      document.documentElement.style.overflow = ''
    }
  }, [onDone])

  return (
    <div ref={root} className="preloader" aria-hidden="true">
      <div className="preloader__panel preloader__panel--a" />
      <div className="preloader__panel preloader__panel--b" />
      <div className="preloader__content">
        <Mark className="preloader__mark" />
        <span className="preloader__count mono">{String(count).padStart(3, '0')}</span>
        <span className="preloader__label mono">WARMING TYRES</span>
      </div>
    </div>
  )
}

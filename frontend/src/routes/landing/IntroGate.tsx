import { useEffect, useRef } from 'react'
import { GlitchTitle } from '../../components/motion/GlitchTitle'
import { SplitReveal } from '../../components/motion/SplitReveal'
import './IntroGate.css'

export function IntroGate({ onEnter }: { onEnter: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const firedRef = useRef(false)

  const fire = () => {
    if (firedRef.current) return
    firedRef.current = true
    onEnter()
  }

  useEffect(() => {
    btnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        fire()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="gt-gate" onClick={fire} role="presentation">
      <div className="gt-gate__arcs" aria-hidden="true">
        <svg viewBox="0 0 600 600" className="gt-gate__arcs-svg">
          <ellipse
            cx="300"
            cy="300"
            r="250"
            fill="none"
            stroke="var(--gt-data-chalk)"
            strokeOpacity="0.1"
            strokeWidth="1"
            strokeDasharray="2 14"
          />
          <ellipse
            cx="300"
            cy="300"
            r="185"
            fill="none"
            stroke="var(--gt-signal)"
            strokeOpacity="0.3"
            strokeWidth="1.5"
            strokeDasharray="180 980"
          />
          <ellipse
            cx="300"
            cy="300"
            r="120"
            fill="none"
            stroke="var(--gt-data-cyan)"
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="90 660"
          />
        </svg>
      </div>

      <div className="gt-gate__inner">
        <p className="gt-gate__kicker mono">HISTORICAL REPLAY · SESSION 9558</p>
        <GlitchTitle text="GRIDTRACE" level={1} className="gt-gate__title" />
        <p className="gt-gate__tagline">
          <SplitReveal text="Every gap tells a story." delayMs={260} />
        </p>
        <button ref={btnRef} type="button" className="gt-gate__cta mono" onClick={fire}>
          ENTER REPLAY
        </button>
        <p className="gt-gate__hint mono">CLICK ANYWHERE OR PRESS ENTER</p>
      </div>
    </div>
  )
}

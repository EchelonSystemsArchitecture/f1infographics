import { useEffect, useRef, useState } from 'react'
import { scrollToTarget } from '../../hooks/useSmoothScroll'
import { WheelArt } from './WheelArt'

const SECTIONS = [
  { id: 'gate', label: 'Pitwall' },
  { id: 'top', label: 'Landing' },
  { id: 'garage', label: 'Garage' },
  { id: 'finish', label: 'Finish' },
]

const R = 46
const C = 2 * Math.PI * R

export function TyreProgress({ visible }: { visible: boolean }) {
  const wheel = useRef<SVGGElement>(null)
  const wheelB = useRef<SVGGElement>(null)
  const arc = useRef<SVGCircleElement>(null)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [past, setPast] = useState(false)

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let angle = 0
    let target = 0
    let lastY = window.scrollY
    const tick = () => {
      const y = window.scrollY
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const p = Math.min(1, Math.max(0, y / max))
      if (arc.current) arc.current.style.strokeDashoffset = String(C * (1 - p))
      if (!reduced) {
        target += (y - lastY) * 0.35
        lastY = y
        angle += (target - angle) * 0.12
        const t = `rotate(${angle.toFixed(2)}deg)`
        if (wheel.current) wheel.current.style.transform = t
        if (wheelB.current) wheelB.current.style.transform = t
      }
      if (!reduced && Math.abs(target - angle) > 0.05) raf = requestAnimationFrame(tick)
      else raf = 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
    }
  }, [])

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const idx = SECTIONS.findIndex((s) => s.id === e.target.id)
          if (idx >= 0) setActive(idx)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className={`tyreprog${visible && past ? ' is-visible' : ''}${open ? ' is-open' : ''}`}>
      <ol className="tyreprog__list" aria-label="Page sections">
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              className={i === active ? 'is-on' : ''}
              onClick={() => {
                setOpen(false)
                scrollToTarget(s.id === 'gate' ? 0 : `#${s.id}`)
              }}
            >
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="tyreprog__label" aria-hidden="true">
        <span className="mono">
          {String(active + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
        </span>
        <b key={active}>{SECTIONS[active].label}</b>
      </div>

      <button
        type="button"
        className="tyreprog__btn"
        aria-expanded={open}
        aria-label={`Section ${active + 1} of ${SECTIONS.length}: ${SECTIONS[active].label}. Open section list`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={R} className="tyreprog__track" />
          <circle
            ref={arc}
            cx="60"
            cy="60"
            r={R}
            className="tyreprog__arc"
            strokeDasharray={C}
            strokeDashoffset={C}
            transform="rotate(-90 60 60)"
          />
          <WheelArt spinA={wheel} spinB={wheelB} />
          {SECTIONS.map((_, i) => {
            const a = ((i / SECTIONS.length) * 360 - 90) * (Math.PI / 180)
            return (
              <circle
                key={i}
                cx={60 + Math.cos(a) * 54}
                cy={60 + Math.sin(a) * 54}
                r={i === active ? 3 : 1.8}
                className={`tyreprog__pip${i <= active ? ' is-on' : ''}`}
              />
            )
          })}
        </svg>
      </button>
    </div>
  )
}

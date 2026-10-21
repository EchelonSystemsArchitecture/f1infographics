import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import Magnet from '../reactbits/Magnet/Magnet'
import { scrollToTarget } from '../../hooks/useSmoothScroll'
import { useTeam } from '../../theme/useTeam'
import { MODULES } from './modules'

const PAGES = [
  { href: '#top', label: 'The landing' },
  { href: '#garage', label: 'Garage' },
  { href: '#finish', label: 'Finish' },
]

export function Roll({ text }: { text: string }) {
  const chars = text.split('')
  return (
    <span className="roll" aria-label={text}>
      {(['roll__a', 'roll__b'] as const).map((cls) => (
        <span key={cls} className={cls} aria-hidden="true">
          {chars.map((c, k) => (
            <span key={k} style={{ ['--k' as string]: k }}>
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

export function Gateway({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null)
  const { team } = useTeam()

  useEffect(() => {
    if (!ready || !root.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const q = gsap.utils.selector(root.current)
    const tl = gsap.timeline()
    tl.set(q('.menu__link, .menu__note'), { yPercent: 105 })
      .set(q('.menu__side-item'), { yPercent: 40, autoAlpha: 0 })
      .set(q('.menu__row'), { '--line': 0 })
      .to(q('.menu__row'), { '--line': 1, duration: 1.1, ease: 'expo.out', stagger: 0.05 }, 0.05)
      .to(q('.menu__link, .menu__note'), { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.045 }, 0.1)
      .to(q('.menu__side-item'), { yPercent: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.07 }, 0.25)
    return () => {
      tl.kill()
    }
  }, [ready])

  return (
    <section id="gate" ref={root} className="gate" aria-labelledby="gate-title">
      <nav className="menu__nav" aria-label="Pitwall modules">
        <p className="menu__kicker mono menu__side-item">INSIDE THE PITWALL · {team.label} THEME</p>
        <h1 id="gate-title" className="sr-only">
          GridTrace pitwall modules
        </h1>
        {MODULES.map((m, i) => (
          <Link key={m.label} to={m.to} className="menu__row">
            <span className="menu__idx mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="menu__mask">
              <span className="menu__link">
                <Roll text={m.label} />
              </span>
            </span>
            <span className="menu__mask menu__mask--note">
              <span className="menu__note">
                {m.note}
                <b className="mono">OPEN ↗</b>
              </span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="menu__side">
        <div className="menu__pages menu__side-item">
          <p className="menu__kicker mono">ON THIS PAGE</p>
          {PAGES.map((p) => (
            <a
              key={p.href}
              href={p.href}
              onClick={(e) => {
                e.preventDefault()
                scrollToTarget(p.href)
              }}
            >
              {p.label}
            </a>
          ))}
        </div>
        <div className="menu__aside menu__side-item">
          <p className="menu__kicker mono">FLAGSHIP REPLAY</p>
          <p className="menu__big">Silverstone · 2024</p>
          <p className="menu__meta mono">SESSION 9558 · REPLAY DATA</p>
          <Magnet padding={30} magnetStrength={5} maxOffset={6}>
            <Link to="/app" className="btn btn--dark">
              Enter the pitwall
            </Link>
          </Magnet>
        </div>
      </div>

      <button type="button" className="gate__scroll mono" onClick={() => scrollToTarget('#top')}>
        <span>SCROLL FOR THE LANDING</span>
        <i aria-hidden="true" />
      </button>
    </section>
  )
}

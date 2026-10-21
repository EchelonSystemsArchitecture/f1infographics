import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import Magnet from '../reactbits/Magnet/Magnet'
import { lockScroll, scrollToTarget } from '../../hooks/useSmoothScroll'
import { useTeam } from '../../theme/useTeam'
import { Mark } from './Mark'
import { MODULES } from './modules'

const LINKS = [
  { href: '#top', label: 'The landing' },
  { href: '#garage', label: 'Garage' },
  { href: '#finish', label: 'Finish' },
]


export function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [onGate, setOnGate] = useState(true)
  const { team } = useTeam()

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      setOnGate(window.scrollY < window.innerHeight * 0.85)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closing = useRef(false)
  const panel = useRef<HTMLDivElement>(null)

  const close = useCallback((after?: () => void) => {
    if (closing.current || !panel.current) return
    closing.current = true
    const q = gsap.utils.selector(panel.current)
    gsap
      .timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          closing.current = false
          setOpen(false)
          after?.()
        },
      })
      .to(q('.menu__link, .menu__note'), { yPercent: -105, duration: 0.45, ease: 'power3.in', stagger: { each: 0.03, from: 'end' } })
      .to(q('.menu__side-item'), { yPercent: -40, autoAlpha: 0, duration: 0.35, ease: 'power3.in', stagger: 0.03 }, 0)
      .to(q('.menu__row'), { '--line': 0, duration: 0.45, ease: 'power3.in', stagger: { each: 0.03, from: 'end' } }, 0)
      .to(panel.current, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' }, 0.3)
      .set(panel.current, { autoAlpha: 0 })
  }, [])

  useEffect(() => {
    lockScroll(open)
    if (!open || !panel.current) return
    const q = gsap.utils.selector(panel.current)
    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
    tl.set(panel.current, { autoAlpha: 1, clipPath: 'inset(0% 0% 100% 0%)' })
      .set(q('.menu__link, .menu__note'), { yPercent: 105 })
      .set(q('.menu__side-item'), { yPercent: 40, autoAlpha: 0 })
      .set(q('.menu__row'), { '--line': 0 })
      .to(panel.current, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' })
      .to(q('.menu__row'), { '--line': 1, duration: 1, ease: 'expo.out', stagger: 0.05 }, 0.45)
      .to(q('.menu__link, .menu__note'), { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.045 }, 0.5)
      .to(q('.menu__side-item'), { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, 0.6)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const go = (href: string) => close(() => scrollToTarget(href))

  return (
    <>
      <header className={`nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}${onGate && !open ? ' is-gate' : ''}`}>
        <a href="#top" className="nav__brand" onClick={(e) => (e.preventDefault(), scrollToTarget(0))}>
          <span className="nav__brand-serif">Grid</span>
          <span className="nav__brand-bold">TRACE</span>
        </a>
        <div className="nav__center" aria-hidden="true">
          <Mark size={30} />
        </div>
        <div className="nav__actions">
          <span className="nav__theme mono" title="Active team theme">
            <i style={{ background: team.colors.primary }} />
            {team.label}
          </span>
          <Magnet padding={24} magnetStrength={6} maxOffset={5}>
            <Link to="/app" className="btn btn--primary btn--sm">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 10 L10 2 M4 2 H10 V8" stroke="currentColor" strokeWidth="1.6" fill="none" />
              </svg>
              Pitwall
            </Link>
          </Magnet>
          <button
            type="button"
            className="nav__menu-btn"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div id="site-menu" ref={panel} className={`menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <nav className="menu__nav" aria-label="Pitwall modules">
          <p className="menu__kicker mono menu__side-item">INSIDE THE PITWALL</p>
          {MODULES.map((m, i) => (
            <Link
              key={m.label}
              to={m.live ? m.to : '#'}
              tabIndex={open ? 0 : -1}
              aria-disabled={!m.live}
              className={`menu__row${m.live ? '' : ' is-soon'}`}
              onClick={(e) => {
                if (!m.live) e.preventDefault()
              }}
            >
              <span className="menu__idx mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="menu__mask">
                <span className="menu__link">
                  <span className="roll" aria-label={m.label}>
                    <span className="roll__a" aria-hidden="true">
                      {m.label.split('').map((c, k) => (
                        <span key={k} style={{ ['--k' as string]: k }}>
                          {c === ' ' ? ' ' : c}
                        </span>
                      ))}
                    </span>
                    <span className="roll__b" aria-hidden="true">
                      {m.label.split('').map((c, k) => (
                        <span key={k} style={{ ['--k' as string]: k }}>
                          {c === ' ' ? ' ' : c}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              </span>
              <span className="menu__mask menu__mask--note">
                <span className="menu__note">
                  {m.note}
                  <b className="mono">{m.live ? 'OPEN ↗' : 'SOON'}</b>
                </span>
              </span>
            </Link>
          ))}
        </nav>
        <div className="menu__side">
          <div className="menu__pages menu__side-item">
            <p className="menu__kicker mono">ON THIS PAGE</p>
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                tabIndex={open ? 0 : -1}
                onClick={(e) => {
                  e.preventDefault()
                  go(l.href)
                }}
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="menu__aside menu__side-item">
            <p className="menu__kicker mono">FLAGSHIP REPLAY</p>
            <p className="menu__big">Silverstone · 2024</p>
            <p className="menu__meta mono">SESSION 9558 · REPLAY DATA</p>
            <Link to="/app" className="btn btn--primary" tabIndex={open ? 0 : -1}>
              Enter the pitwall
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

import { useEffect, useState, type ReactElement } from 'react'
import { ICONS, Icon, SETTINGS } from './icons'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Mark } from '../landing/Mark'
import { Roll } from '../landing/Gateway'
import { MODULES } from '../landing/modules'
import './PitRail.css'

export function PitRail({
  sessionLabel,
  sessionBadge,
  onSessions,
}: {
  sessionLabel: string
  sessionBadge: ReactElement
  onSessions: () => void
}) {
  const [open, setOpen] = useState(false)
  const [intro, setIntro] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const navigate = useNavigate()

  useEffect(() => {
    if (!intro) return
    const id = window.setTimeout(() => setIntro(false), 650)
    return () => window.clearTimeout(id)
  }, [intro])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const expanded = open || intro
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".pitrail__nav")
    const panel = document.querySelector<HTMLElement>(".pitrail__panel")
    if (nav && panel) panel.style.setProperty("--nav-top", `${nav.offsetTop}px`)
  })

  return (
    <aside className="pitrail" aria-label="Pitwall navigation">
      <div className={`pitrail__panel${expanded ? ' is-open' : ''}${intro ? ' is-intro' : ''}`}>
        <div className="pitrail__rail">
          <Link to="/landing" className="pitrail__mark" aria-label="Open the landing page" title="Open the landing page">
            <Mark size={28} />
          </Link>
          <button
            type="button"
            className={`pitrail__toggle${open ? ' is-open' : ''}`}
            aria-expanded={open}
            aria-label={open ? 'Collapse to sidebar' : 'Expand menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          <nav className="pitrail__nav" aria-label="Modules">
            {MODULES.map((m, i) => (
              <NavLink
                key={m.to + m.label}
                to={m.to}
                end={m.to === '/app'}
                aria-label={m.label}
                className={({ isActive }) => `pitrail__item${isActive ? ' is-active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon>{ICONS[i]}</Icon>
                <span className="pitrail__num mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="pitrail__tip">{m.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="pitrail__foot">
            <NavLink
              to="/app/settings"
              aria-label="Settings"
              className={({ isActive }) => `pitrail__item pitrail__item--sm${isActive ? ' is-active' : ''}`}
            >
              <Icon size={20}>{SETTINGS}</Icon>
              <span className="pitrail__tip">Settings</span>
            </NavLink>
            <button type="button" className="pitrail__session" aria-label={`Session: ${sessionLabel}. Change`} onClick={onSessions}>
              {sessionBadge}
            </button>
          </div>
        </div>

        <div className="pitrail__big" aria-hidden={!open}>
          <nav className="pitrail__rows" aria-label="Modules, expanded">
            {MODULES.map((m, i) => (
              <button
                key={m.label}
                type="button"
                tabIndex={open ? 0 : -1}
                className="menu__row pitrail__row"
                style={{ ['--i' as string]: i }}
                onClick={() => {
                  navigate(m.to)
                  setOpen(false)
                }}
              >
                <span className="menu__mask">
                  <span className="menu__link">
                    <Roll text={m.label} />
                  </span>
                </span>
                <span className="menu__mask menu__mask--note">
                  <span className="menu__note">{m.note}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="pitrail__side">
            <p className="pitrail__kicker mono">INSIDE THE PITWALL · NOW REPLAYING</p>
            <p className="pitrail__big-title">{sessionLabel}</p>
            <button type="button" className="btn btn--dark" tabIndex={open ? 0 : -1} onClick={() => (setOpen(false), onSessions())}>
              Change session
            </button>
            <Link to="/landing" className="pitrail__home" tabIndex={open ? 0 : -1}>
              Visit the landing →
            </Link>
          </div>
        </div>
      </div>
      {open && <button type="button" className="pitrail__scrim" aria-label="Collapse menu" onClick={() => setOpen(false)} />}
    </aside>
  )
}

import { useEffect, useState, type ReactElement } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Mark } from '../landing/Mark'
import { Roll } from '../landing/Gateway'
import { MODULES } from '../landing/modules'
import './PitRail.css'

const ICONS: ReactElement[] = [
  <>
    <path d="M5 21V3" />
    <path d="M5 4h14v10H5" />
    <path d="M5 4h4.7v3.3H5zM14.3 4H19v3.3h-4.7zM9.7 7.3h4.6v3.4H9.7zM5 10.7h4.7V14H5zM14.3 10.7H19V14h-4.7z" fill="currentColor" stroke="none" />
  </>,
  <>
    <path d="M3 6l6 6-6 6" />
    <path d="M21 6l-6 6 6 6" />
    <path d="M12 3v18" strokeDasharray="2.5 2.5" />
  </>,
  <>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </>,
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </>,
  <>
    <path d="M4 15a8 8 0 0 1 16-3v6H8a4 4 0 0 1-4-3z" />
    <path d="M10 12h10" />
    <path d="M8 18v3M16 18v3" />
  </>,
  <>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
  </>,
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" />
  </>,
  <>
    <rect x="3" y="4" width="18" height="5" rx="1" />
    <path d="M5 9v10h14V9" />
    <path d="M10 13h4" />
  </>,
]

const SETTINGS = (
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </>
)

function Icon({ children, size = 22 }: { children: ReactElement; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

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

  return (
    <aside className="pitrail" aria-label="Pitwall navigation">
      <div className={`pitrail__panel${expanded ? ' is-open' : ''}${intro ? ' is-intro' : ''}`}>
        <div className="pitrail__rail">
          <Link to="/" className="pitrail__mark" aria-label="Back to the greeting" title="Back to the greeting">
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
            <p className="pitrail__kicker mono">INSIDE THE PITWALL</p>
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
                <span className="pitrail__row-icon">
                  <Icon size={26}>{ICONS[i]}</Icon>
                </span>
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
            <p className="pitrail__kicker mono">NOW REPLAYING</p>
            <p className="pitrail__big-title">{sessionLabel}</p>
            <button type="button" className="btn btn--dark" tabIndex={open ? 0 : -1} onClick={() => (setOpen(false), onSessions())}>
              Change session
            </button>
            <Link to="/" className="pitrail__home" tabIndex={open ? 0 : -1}>
              ← Back to the greeting
            </Link>
          </div>
        </div>
      </div>
      {open && <button type="button" className="pitrail__scrim" aria-label="Collapse menu" onClick={() => setOpen(false)} />}
    </aside>
  )
}

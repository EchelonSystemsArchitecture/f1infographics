import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Magnet from '../reactbits/Magnet/Magnet'
import { scrollToTarget } from '../../hooks/useSmoothScroll'
import { useTeam } from '../../theme/useTeam'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { team } = useTeam()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <a href="#top" className="nav__brand" onClick={(e) => (e.preventDefault(), scrollToTarget(0))}>
        <span className="nav__brand-serif">Grid</span>
        <span className="nav__brand-bold">TRACE</span>
      </a>
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
      </div>
    </header>
  )
}

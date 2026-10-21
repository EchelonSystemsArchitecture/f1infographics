import { useCallback, useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ClickSpark from '../../components/reactbits/ClickSpark/ClickSpark'
import { Preloader } from '../../components/landing/Preloader'
import { Nav } from '../../components/landing/Nav'
import { PitRail } from '../../components/app/PitRail'
import { useNavigate } from 'react-router-dom'
import { Hero } from '../../components/landing/Hero'
import { Marquee } from '../../components/landing/Marquee'
import { TyreProgress } from '../../components/landing/TyreProgress'
import { Garage } from '../../components/landing/Garage'
import { Footer } from '../../components/landing/Footer'
import { scrollToTarget, useSmoothScroll } from '../../hooks/useSmoothScroll'
import { useTeam } from '../../theme/useTeam'
import './Landing.css'

export function Landing() {
  const { team } = useTeam()
  const navigate = useNavigate()
  const [ready, setReady] = useState(
    () => new URLSearchParams(window.location.search).has('skipintro') || window.location.hash === '#top',
  )
  const onDone = useCallback(() => setReady(true), [])
  useSmoothScroll(true)

  useEffect(() => {
    if (window.location.hash !== '#top') return
    const el = document.getElementById('top')
    if (el) window.scrollTo(0, el.offsetTop)
    const id = window.setTimeout(() => scrollToTarget('#top'), 120)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 300)
    return () => window.clearTimeout(id)
  }, [ready])

  return (
    <ClickSpark sparkColor={[team.colors.primary, team.colors.secondary]} sparkCount={10} sparkRadius={26}>
      <div className="landing">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {!ready && <Preloader onDone={onDone} />}
        <PitRail
          intro={false}
          sessionLabel="Silverstone · 2024"
          sessionBadge={<span className="badge badge-replay">REPLAY</span>}
          onSessions={() => navigate('/app/vault')}
        />
        <Nav />
        <main id="main">
          <Hero ready={ready} />
          <Marquee />
          <Garage />
        </main>
        <Footer />
        <TyreProgress visible={ready} />
      </div>
    </ClickSpark>
  )
}

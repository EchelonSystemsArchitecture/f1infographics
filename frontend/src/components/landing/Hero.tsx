import { Suspense, lazy, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import Noise from '../reactbits/Noise/Noise'
import Magnet from '../reactbits/Magnet/Magnet'
import { useTeam } from '../../theme/useTeam'
import { useInView } from '../../hooks/useInView'
import { scrollToTarget } from '../../hooks/useSmoothScroll'
import { circuitPathD } from '../../data/circuit'

const HeroCar = lazy(() => import('./HeroCar'))

export function Hero({ ready }: { ready: boolean }) {
  const { team } = useTeam()
  const [ref, inView] = useInView<HTMLElement>('0px')
  const root = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!ready || !root.current) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.hero__beam', { scaleY: 0, duration: 1.2, ease: 'expo.inOut' })
        .from('.hero__word-char', { yPercent: 110, duration: 1.1, stagger: 0.06 }, '-=0.7')
        .from('.hero__line > span', { yPercent: 115, duration: 1, stagger: 0.08 }, '-=0.8')
        .from('.hero__fade', { opacity: 0, y: 20, duration: 0.8, stagger: 0.06 }, '-=0.7')
        .from('.hero__frame-tick', { scale: 0, duration: 0.6, stagger: 0.04 }, '<')
    }, root)
    return () => ctx.revert()
  }, [ready])

  const word = 'GAP'

  return (
    <section
      id="top"
      ref={(el) => {
        root.current = el
        ref.current = el
      }}
      className="hero"
      aria-labelledby="hero-title"
    >
      <div className="hero__concrete" aria-hidden="true" />
      <div className="hero__beam" aria-hidden="true" />
      <div className="hero__word" aria-hidden="true">
        {word.split('').map((c, i) => (
          <span key={i} className="hero__word-mask">
            <span className="hero__word-char">{c}</span>
          </span>
        ))}
      </div>
      <div className="hero__word hero__word--lit" aria-hidden="true">
        {word.split('').map((c, i) => (
          <span key={i} className="hero__word-mask">
            <span className="hero__word-char">{c}</span>
          </span>
        ))}
      </div>

      <div className="hero__car" aria-hidden="true">
        <Suspense fallback={null}>
          <HeroCar team={team} intro={ready} paused={!inView} />
        </Suspense>
      </div>

      <Noise opacity={0.07} size={2} fps={18} blendMode="overlay" />

      <div className="hero__frame" aria-hidden="true">
        {['tl', 'tr', 'bl', 'br'].map((k) => (
          <span key={k} className={`hero__frame-tick hero__frame-tick--${k}`} />
        ))}
      </div>

      <div className="hero__meta hero__fade mono" aria-hidden="true">
        <span>HISTORICAL REPLAY</span>
        <span>N° {String(team.number).padStart(2, '0')} · {team.label} THEME</span>
      </div>

      <div className="hero__copy">
        <h1 id="hero-title" className="hero__title">
          <span className="hero__line">
            <span>Every</span>
          </span>
          <span className="hero__line">
            <span>
              <em>gap</em> tells
            </span>
          </span>
          <span className="hero__line">
            <span>a story.</span>
          </span>
        </h1>
        <p className="hero__sub hero__fade">
          Explore the lines behind the result. Replay decisive moments, compare drivers at the same point on
          track, and investigate the decisions that shape a race.
        </p>
        <div className="hero__ctas hero__fade">
          <Magnet padding={30} magnetStrength={5} maxOffset={6}>
            <Link to="/app" className="btn btn--primary btn--lg">
              Enter the pitwall
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 12 L12 2 M5 2 H12 V9" stroke="currentColor" strokeWidth="1.8" fill="none" />
              </svg>
            </Link>
          </Magnet>
          <button type="button" className="btn btn--ghost btn--lg" onClick={() => scrollToTarget('#garage')}>
            Explore a race
          </button>
        </div>
      </div>

      <Link to="/app" className="hero__session hero__fade" aria-label="Open the flagship replay: British Grand Prix 2024">
        <span className="hero__session-k mono">FLAGSHIP REPLAY</span>
        <svg viewBox="0 0 100 100" className="hero__session-map" aria-hidden="true">
          <path d={circuitPathD(100, 8)} />
        </svg>
        <span className="hero__session-name">British GP</span>
        <span className="hero__session-meta mono">SILVERSTONE · 2024 · S9558</span>
      </Link>

      <div className="hero__scroll hero__fade mono" aria-hidden="true">
        <span>SCROLL</span>
        <i />
      </div>
    </section>
  )
}

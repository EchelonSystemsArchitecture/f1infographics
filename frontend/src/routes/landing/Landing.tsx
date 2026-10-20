import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircuitPath } from '../../components/svg/CircuitPath'
import { PhaseCar } from './PhaseCar'
import { BootSequence } from './BootSequence'
import { IntroGate } from './IntroGate'
import { useReveal } from './useReveal'
import { ContourField } from '../../components/landing/ContourField'
import { CustomCursor } from '../../components/landing/CustomCursor'
import { DecryptedText } from '../../components/reactbits/DecryptedText'
import { CountUp } from '../../components/reactbits/CountUp'
import './Landing.css'

type Phase = 'boot' | 'gate' | 'main'

const ENTERED_KEY = 'gt:entered'

type Chapter = {
  id: string
  label: string
  title: string
  body: string
  progress: number
  stat: { value: number; decimals: number; suffix: string; caption: string }
}

const CHAPTERS: Chapter[] = [
  {
    id: '01',
    label: 'POSITIONS',
    title: 'Watch the order evolve.',
    body: 'Lap by lap, the tower rebuilds from cached timing. One shared race clock drives every panel — no stitched-together guesses.',
    progress: 0.22,
    stat: { value: 20, decimals: 0, suffix: ' CARS', caption: 'FIELD REBUILT EACH LAP' },
  },
  {
    id: '02',
    label: 'GAPS',
    title: 'Where the gaps open.',
    body: 'Scrub to any second and read the true interval between any two cars. Pit windows and tyre age explain the delta, not just the leaderboard.',
    progress: 0.48,
    stat: { value: 3.867, decimals: 3, suffix: 's', caption: 'MEASURED INTERVAL, LAP 24' },
  },
  {
    id: '03',
    label: 'PIT WINDOWS',
    title: 'Strategy, made visible.',
    body: 'Explore how compound choice reshapes the race in a clearly-marked SIMULATION layer — never dressed up as measured fact.',
    progress: 0.74,
    stat: { value: 52, decimals: 0, suffix: ' LAPS', caption: 'FULL SESSION REPLAYABLE' },
  },
  {
    id: '04',
    label: 'SECTOR PACE',
    title: 'The difference, isolated.',
    body: 'Track sector-by-sector pace across the session and see exactly where a move was won — or where a gap quietly bled away.',
    progress: 1,
    stat: { value: 0.912, decimals: 3, suffix: 's', caption: 'SECTOR DELTA AT ITS PEAK' },
  },
]

function readEntered(): boolean {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === '1'
  } catch {
    return false
  }
}

function writeEntered(): void {
  try {
    sessionStorage.setItem(ENTERED_KEY, '1')
  } catch {
    return
  }
}

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function Landing() {
  const [phase, setPhase] = useState<Phase>(() => {
    if (prefersReduced() || readEntered()) return 'main'
    return 'boot'
  })
  const [activeChapter, setActiveChapter] = useState(0)
  const [showRail, setShowRail] = useState(false)
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const chaptersRef = useRef<HTMLDivElement>(null)
  const chaptersSectionRef = useRef<HTMLElement>(null)
  useReveal(rootRef)

  const enter = useCallback(() => {
    writeEntered()
    setPhase('main')
    requestAnimationFrame(() => ctaRef.current?.focus())
  }, [])

  useEffect(() => {
    if (phase === 'main') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  useEffect(() => {
    const host = chaptersRef.current
    if (!host) return
    const items = Array.from(host.querySelectorAll('[data-chapter]'))
    if (items.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = items.indexOf(visible.target)
        if (index >= 0) setActiveChapter(index)
      },
      { threshold: [0.4, 0.6, 0.85], rootMargin: '-20% 0px -20% 0px' },
    )
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [phase])

  useEffect(() => {
    const section = chaptersSectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowRail(entry.isIntersecting),
      { threshold: 0.15 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [phase])

  const onBootDone = useCallback(() => setPhase('gate'), [])
  const active = CHAPTERS[activeChapter]

  return (
    <div className="landing" ref={rootRef} data-phase={phase}>
      <ContourField />
      <CustomCursor />
      <div className="landing__grain" aria-hidden="true" />

      {phase === 'boot' ? <BootSequence onDone={onBootDone} /> : null}
      {phase === 'gate' ? <IntroGate onEnter={enter} /> : null}

      <header className="landing__header">
        <span className="landing__wordmark mono">GRIDTRACE</span>
        <nav className="landing__nav">
          <a href="#chapters" className="landing__nav-link mono">
            THE RACE
          </a>
          <a href="#record" className="landing__nav-link mono">
            THE RECORD
          </a>
          <span className="badge badge-replay">REPLAY</span>
        </nav>
      </header>

      <section className="landing__hero" aria-labelledby="hero-title">
        <p className="landing__kicker mono">
          <DecryptedText text="MOTORSPORT RACE ANALYSIS · HISTORICAL REPLAY" speed={38} />
        </p>
        <h1 id="hero-title" className="landing__display">
          <span className="landing__display-line">EVERY GAP</span>
          <span className="landing__display-line landing__display-line--accent">TELLS A STORY</span>
        </h1>

        <div className="landing__hero-stage" aria-hidden="true">
          <div className="landing__hero-circuit">
            <CircuitPath width={640} progress={1} />
            <div className="landing__hero-car">
              <PhaseCar width={320} />
            </div>
          </div>
        </div>

        <div className="landing__hero-foot">
          <p className="landing__thesis">
            A leaderboard tells you <strong>where</strong>. GRIDTRACE helps you understand{' '}
            <strong>why</strong>.
          </p>
          <div className="landing__cta-row">
            <Link ref={ctaRef} to="/app" className="landing__cta landing__cta--primary">
              ENTER THE PITWALL
            </Link>
            <a href="#chapters" className="landing__cta landing__cta--secondary">
              EXPLORE A RACE
            </a>
          </div>
        </div>

        <a href="#chapters" className="landing__scroll-cue mono" aria-label="Scroll to chapters">
          <span>SCROLL</span>
          <span className="landing__scroll-cue-line" />
        </a>
      </section>

      <section
        id="chapters"
        ref={chaptersSectionRef}
        className="landing__chapters"
        aria-label="How GRIDTRACE decodes a race"
      >
        <div className="landing__chapters-stage" data-active={activeChapter} aria-hidden="true">
          <div className="landing__stage-circuit">
            <CircuitPath width={560} progress={active.progress} />
            <div className="landing__stage-car">
              <PhaseCar width={280} />
            </div>
          </div>
          <div className="landing__stage-readout mono">
            <span className="landing__stage-index">{active.id}</span>
            <DecryptedText key={active.id} text={active.label} speed={40} maxIterations={8} />
          </div>
        </div>

        <nav className="landing__rail" aria-label="Chapters" data-show={showRail}>
          {CHAPTERS.map((ch, i) => (
            <a
              key={ch.id}
              href={`#chapter-${ch.id}`}
              className="landing__rail-item mono"
              data-active={i === activeChapter}
            >
              <span className="landing__rail-dot" />
              <span className="landing__rail-label">{ch.label}</span>
            </a>
          ))}
        </nav>

        <div className="landing__chapters-track" ref={chaptersRef}>
          {CHAPTERS.map((ch, i) => (
            <article
              key={ch.id}
              id={`chapter-${ch.id}`}
              className="landing__chapter"
              data-chapter
              data-side={i % 2 === 0 ? 'left' : 'right'}
            >
              <div className="landing__chapter-card">
                <p className="landing__chapter-kicker mono">
                  CHAPTER {ch.id} · {ch.label}
                </p>
                <h2 className="landing__chapter-title">{ch.title}</h2>
                <p className="landing__chapter-body">{ch.body}</p>
                <div className="landing__stat">
                  <span className="landing__stat-value">
                    <CountUp
                      to={ch.stat.value}
                      decimals={ch.stat.decimals}
                      suffix={ch.stat.suffix}
                    />
                  </span>
                  <span className="landing__stat-caption mono">{ch.stat.caption}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="record" className="landing__section" aria-labelledby="record-title" data-reveal>
        <p className="landing__section-kicker mono">05 · THE RECORD</p>
        <h2 id="record-title" className="landing__section-title">
          Honest by design.
        </h2>
        <p className="landing__body">
          Every view is labelled with its data mode. If data is missing, we show it — never
          invented numbers. Traceable to a cached response or a deterministic transform of one.
        </p>
        <div className="landing__modes" role="list">
          <span className="badge badge-replay" role="listitem">
            REPLAY
          </span>
          <span className="badge badge-estimate" role="listitem">
            ESTIMATE
          </span>
          <span className="badge badge-live" role="listitem">
            LIVE
          </span>
        </div>
      </section>

      <section
        className="landing__section landing__section--finale"
        aria-labelledby="enter-title"
        data-reveal
      >
        <h2 id="enter-title" className="landing__finale-title">
          <DecryptedText text="THE RACE IS STILL TELLING ITS STORY" speed={30} maxIterations={14} />
        </h2>
        <Link to="/app" className="landing__cta landing__cta--primary landing__cta--large">
          ENTER THE PITWALL
        </Link>
      </section>

      <footer className="landing__footer mono">
        GRIDTRACE · HISTORICAL REPLAY · SESSION 9558 · SILVERSTONE 2024
      </footer>
    </div>
  )
}

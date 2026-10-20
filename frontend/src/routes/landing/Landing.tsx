import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircuitPath } from '../../components/svg/CircuitPath'
import { HoverLink } from '../../components/motion/HoverLink'
import { BootSequence } from './BootSequence'
import { IntroGate } from './IntroGate'
import { PhaseCar } from './PhaseCar'
import { useReveal } from './useReveal'
import './Landing.css'

type Phase = 'boot' | 'gate' | 'main'

const ENTERED_KEY = 'gt:entered'

function readEntered(): boolean {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === '1'
  } catch {
    return false
  }
}

function writeEntered(): boolean {
  try {
    sessionStorage.setItem(ENTERED_KEY, '1')
    return true
  } catch {
    return false
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
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
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

  const onBootDone = useCallback(() => setPhase('gate'), [])

  return (
    <div className="landing" ref={rootRef} data-phase={phase}>
      <div className="landing__grain" aria-hidden="true" />

      {phase === 'boot' ? <BootSequence onDone={onBootDone} /> : null}
      {phase === 'gate' ? <IntroGate onEnter={enter} /> : null}

      <header className="landing__header">
        <span className="landing__wordmark mono">GRIDTRACE</span>
        <span className="badge badge-replay">REPLAY</span>
      </header>

      <section className="landing__hero" aria-labelledby="hero-title">
        <div className="landing__hero-copy">
          <p className="landing__kicker mono">MOTORSPORT RACE ANALYSIS · HISTORICAL REPLAY</p>
          <h1 id="hero-title" className="landing__title">
            Every gap tells a story.
          </h1>
          <p className="landing__thesis">
            A leaderboard tells you where. <strong>GRIDTRACE</strong> helps you understand why.
          </p>
          <div className="landing__cta-row">
            <Link ref={ctaRef} to="/app" className="landing__cta landing__cta--primary">
              ENTER THE PITWALL
            </Link>
            <a href="#decoded" className="landing__cta landing__cta--secondary">
              EXPLORE A RACE
            </a>
          </div>
          <div className="landing__hero-link">
            <HoverLink href="#record" variant="below" arrow>
              WHY TRUST THESE NUMBERS
            </HoverLink>
          </div>
        </div>

        <div className="landing__hero-visual" aria-hidden="true">
          <div className="landing__scene-frame">
            <div className="landing__scene-stack">
              <CircuitPath width={520} progress={1} />
              <div className="landing__car-overlay">
                <PhaseCar width={300} />
              </div>
            </div>
          </div>
          <p className="landing__visual-caption mono">
            SIGNAL LAP · SINGLE-SEATER STUDY · ORIGINAL ILLUSTRATION
          </p>
        </div>
      </section>

      <section
        id="decoded"
        className="landing__section"
        aria-labelledby="decoded-title"
        data-reveal
      >
        <p className="landing__section-kicker mono">01 · THE RACE DECODED</p>
        <h2 id="decoded-title" className="landing__section-title">
          Three layers. One race.
        </h2>
        <div className="landing__layers">
          <article className="landing__layer">
            <h3 className="landing__layer-title mono">OBSERVE</h3>
            <p>
              Watch the order evolve lap by lap from cached timing data. The shared race clock
              drives every panel from one deterministic time source.
            </p>
          </article>
          <article className="landing__layer">
            <h3 className="landing__layer-title mono">INVESTIGATE</h3>
            <p>
              Scrub back to any moment. Compare intervals, pit windows and race-control calls
              without leaving the replay.
            </p>
          </article>
          <article className="landing__layer">
            <h3 className="landing__layer-title mono">EXPERIMENT</h3>
            <p>
              Explore what-if strategy scenarios in a clearly-marked SIMULATION layer — never
              presented as measured fact.
            </p>
          </article>
        </div>
      </section>

      <section
        id="rewind"
        className="landing__section"
        aria-labelledby="rewind-title"
        data-reveal
      >
        <p className="landing__section-kicker mono">02 · REWIND THE MOMENT</p>
        <h2 id="rewind-title" className="landing__section-title">
          Scrub to any point in the race.
        </h2>
        <p className="landing__body">
          The replay clock is the single time source. Seek forward or backward and every panel
          — tower, intervals, race control — reconstructs the field at that exact second.
        </p>
        <div className="landing__section-link">
          <HoverLink href="/app" variant="below" arrow>
            OPEN THE REPLAY CLOCK
          </HoverLink>
        </div>
      </section>

      <section id="difference" className="landing__section" aria-labelledby="diff-title" data-reveal>
        <p className="landing__section-kicker mono">03 · FIND THE DIFFERENCE</p>
        <h2 id="diff-title" className="landing__section-title">
          Where the gaps open.
        </h2>
        <p className="landing__body">
          Track the interval between any two cars across the whole session. Pit stops, tyre
          age and lap time history explain the deltas — not just the leaderboard.
        </p>
      </section>

      <section id="decision" className="landing__section" aria-labelledby="decision-title" data-reveal>
        <p className="landing__section-kicker mono">04 · TEST THE DECISION</p>
        <h2 id="decision-title" className="landing__section-title">
          Strategy, made visible.
        </h2>
        <p className="landing__body landing__body--tight">
          Explore how compound choice changes the race — labelled clearly as simulation.
        </p>
        <div className="landing__chips" role="list">
          <span className="landing__chip landing__chip--s" role="listitem">
            SOFT
          </span>
          <span className="landing__chip landing__chip--m" role="listitem">
            MEDIUM
          </span>
          <span className="landing__chip landing__chip--h" role="listitem">
            HARD
          </span>
        </div>
      </section>

      <section id="record" className="landing__section" aria-labelledby="record-title" data-reveal>
        <p className="landing__section-kicker mono">05 · THE RECORD</p>
        <h2 id="record-title" className="landing__section-title">
          Honest by design.
        </h2>
        <p className="landing__body">
          Every view is labelled with its data mode. If data is missing, we show it — never
          invented numbers.
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
        <h2 id="enter-title" className="landing__section-title landing__section-title--large">
          The race is still telling its story.
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

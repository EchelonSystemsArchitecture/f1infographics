import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircuitPath } from '../../components/svg/CircuitPath'
import { SingleSeater } from '../../components/svg/SingleSeater'
import './Landing.css'

/** THE SIGNAL LAP — landing page (LANDING_PAGE_DIRECTIVE.md). */
export function Landing() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setProgress(1)
      return
    }
    const start = performance.now()
    const DURATION = 2400
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="landing">
      <header className="landing__header">
        <span className="landing__wordmark mono">GRIDTRACE</span>
        <span className="badge badge-replay">REPLAY</span>
      </header>

      {/* 1 — Signal Lap hero */}
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
            <Link to="/app" className="landing__cta landing__cta--primary">
              ENTER THE PITWALL
            </Link>
            <a href="#decoded" className="landing__cta landing__cta--secondary">
              EXPLORE A RACE
            </a>
          </div>
        </div>
        <div className="landing__hero-visual" aria-hidden="true">
          <div className="landing__circuit">
            <CircuitPath width={520} progress={progress} />
            <div className="landing__seater-overlay">
              <SingleSeater width={280} />
            </div>
          </div>
          <p className="landing__visual-caption mono">
            SIGNAL LAP · 0 → {Math.round(progress * 100)}% · ORIGINAL ILLUSTRATION
          </p>
        </div>
      </section>

      {/* 2 — The Race Decoded */}
      <section id="decoded" className="landing__section" aria-labelledby="decoded-title">
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

      {/* 3 — Rewind the Moment */}
      <section className="landing__section" aria-labelledby="rewind-title">
        <p className="landing__section-kicker mono">02 · REWIND THE MOMENT</p>
        <h2 id="rewind-title" className="landing__section-title">
          Scrub to any point in the race.
        </h2>
        <p className="landing__body">
          The replay clock is the single time source. Seek forward or backward and every panel
          — tower, intervals, race control — reconstructs the field at that exact second.
        </p>
      </section>

      {/* 4 — Find the Difference */}
      <section className="landing__section" aria-labelledby="diff-title">
        <p className="landing__section-kicker mono">03 · FIND THE DIFFERENCE</p>
        <h2 id="diff-title" className="landing__section-title">
          Where the gaps open.
        </h2>
        <p className="landing__body">
          Track the interval between any two cars across the whole session. Pit stops, tyre
          age and lap time history explain the deltas — not just the leaderboard.
        </p>
      </section>

      {/* 5 — Test the Decision */}
      <section className="landing__section" aria-labelledby="decision-title">
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

      {/* 6 — The Record */}
      <section className="landing__section" aria-labelledby="record-title">
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

      {/* 7 — Enter the Pitwall */}
      <section className="landing__section landing__section--finale" aria-labelledby="enter-title">
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

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ScrollVelocity from '../reactbits/ScrollVelocity/ScrollVelocity'
import { Topo } from './Topo'

gsap.registerPlugin(ScrollTrigger)

const LINES: { t: string; serif?: boolean; accent?: boolean }[][] = [
  [{ t: 'A leaderboard', serif: true, accent: true }, { t: 'tells' }],
  [{ t: 'you' }, { t: 'where.', serif: true }],
  [{ t: 'GridTrace' }, { t: 'helps you', serif: true }],
  [{ t: 'understand' }, { t: 'why.', serif: true, accent: true }],
]

export function Manifesto() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray<HTMLElement>('.manifesto__line')
      lines.forEach((line, i) => {
        const block = line.querySelector('.manifesto__block')
        const text = line.querySelector('.manifesto__text')
        const tl = gsap.timeline({
          scrollTrigger: { trigger: line, start: 'top 88%', end: 'top 45%', scrub: 0.6 },
        })
        tl.fromTo(block, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.5, ease: 'none' })
          .set(text, { opacity: 1 })
          .set(block, { transformOrigin: 'right center' })
          .to(block, { scaleX: 0, duration: 0.5, ease: 'none' })
        gsap.set(text, { opacity: 0 })
        gsap.fromTo(
          line,
          { xPercent: i % 2 ? 6 : -6 },
          {
            xPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: line, start: 'top bottom', end: 'top 40%', scrub: true },
          },
        )
      })
      gsap.from('.manifesto__sig path', {
        strokeDashoffset: 600,
        ease: 'none',
        scrollTrigger: { trigger: '.manifesto__sig', start: 'top 85%', end: 'top 35%', scrub: true },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="manifesto" ref={root} className="manifesto" aria-labelledby="manifesto-title">
      <div className="manifesto__band" aria-hidden="true">
        <ScrollVelocity
          texts={['Every gap tells a story', 'Read the race']}
          velocity={60}
          className="manifesto__marquee"
          separator={<span className="manifesto__sep">✦</span>}
          skewWithVelocity={6}
        />
      </div>

      <div className="manifesto__body">
        <Topo seed={4} color="var(--team-primary)" opacity={0.22} />
        <p className="manifesto__kicker mono">01 · THE THESIS</p>
        <h2 id="manifesto-title" className="manifesto__title">
          {LINES.map((line, i) => (
            <span key={i} className="manifesto__line">
              <span className="manifesto__text">
                {line.map((w, j) => (
                  <span key={j} className={`manifesto__w${w.serif ? ' is-serif' : ''}${w.accent ? ' is-accent' : ''}`}>
                    {w.t}{' '}
                  </span>
                ))}
              </span>
              <span className="manifesto__block" aria-hidden="true" />
            </span>
          ))}
        </h2>
        <svg className="manifesto__sig" viewBox="0 0 320 120" aria-hidden="true">
          <path
            d="M10 90 C 40 20, 70 20, 80 70 S 120 110, 140 50 S 180 10, 190 60 L 205 95 L 230 30 C 250 60, 270 70, 310 40"
            pathLength={600}
            strokeDasharray={600}
          />
        </svg>
        <div className="manifesto__foot">
          <p>
            Built on cached, post-session timing data. Every number on screen traces back to a real
            response — or it is labelled as an estimate. No fake live feeds. No invented gaps.
          </p>
          <span className="badge badge-replay">REPLAY</span>
        </div>
      </div>
    </section>
  )
}

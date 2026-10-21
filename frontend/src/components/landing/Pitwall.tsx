import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const MODULES = [
  {
    n: '01',
    title: 'Race Control',
    body: 'Spatial circuit stage, live-style timing tower and every race-control call — all driven by one shared replay clock.',
    img: '/shots/03-app-racecontrol-spatial.png',
    to: '/app',
    status: 'REPLAY',
  },
  {
    n: '02',
    title: 'Editorial board',
    body: 'Flags, penalties and incidents as an editorial timeline. Click an event and the whole board seeks to it.',
    img: '/shots/04-app-racecontrol-blueprint.png',
    to: '/app',
    status: 'REPLAY',
  },
  {
    n: '03',
    title: 'Battle Lab',
    body: 'Two drivers on one distance axis. Speed, throttle, brake and the running delta, sector by sector.',
    img: '/shots/06-app-battlelab.png',
    to: '/app/battle',
    status: 'REPLAY',
  },
  {
    n: '04',
    title: 'Session picker',
    body: 'Choose the session deliberately. Only cached, verified sessions are offered — nothing pretends to be live.',
    img: '/shots/05-app-session-picker.png',
    to: '/app',
    status: 'REPLAY',
  },
]

export function Pitwall() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.module').forEach((el) => {
        gsap.from(el, {
          clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
          duration: 1.2,
          ease: 'expo.inOut',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        })
        gsap.fromTo(
          el.querySelector('img'),
          { yPercent: -8, scale: 1.12 },
          { yPercent: 8, scale: 1.12, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } },
        )
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="pitwall" ref={root} className="pitwall" aria-labelledby="pitwall-title">
      <div className="pitwall__stripes" aria-hidden="true" />
      <header className="pitwall__head">
        <p className="pitwall__kicker mono">05 · THE PITWALL</p>
        <h2 id="pitwall-title" className="pitwall__title">
          <span>Built for the</span>
          <span>
            <em>why</em> behind P1.
          </span>
        </h2>
      </header>
      <div className="pitwall__grid">
        {MODULES.map((m) => (
          <Link key={m.n} to={m.to} className="module">
            <div className="module__img">
              <img src={m.img} alt={`${m.title} screen from the GridTrace app`} loading="lazy" />
            </div>
            <div className="module__body">
              <span className="module__n mono">{m.n}</span>
              <h3 className="module__title">{m.title}</h3>
              <p className="module__p">{m.body}</p>
              <span className="module__foot">
                <span className="badge badge-replay">{m.status}</span>
                <span className="module__go mono">OPEN ↗</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

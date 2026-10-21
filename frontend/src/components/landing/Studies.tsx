import { useEffect, useRef, type PointerEvent } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useTeam } from '../../theme/useTeam'
import { useInView } from '../../hooks/useInView'
import { STUDIES, type Study } from './studyShots'

gsap.registerPlugin(ScrollTrigger)

function StudyCard({ study, index }: { study: Study; index: number }) {
  const { team } = useTeam()
  const [ref, , seen] = useInView<HTMLDivElement>('600px', true)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    e.currentTarget.style.setProperty('--mx', x.toFixed(3))
    e.currentTarget.style.setProperty('--my', y.toFixed(3))
  }
  const onLeave = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--mx', '0')
    e.currentTarget.style.setProperty('--my', '0')
  }

  return (
    <figure className={`study study--${study.variant}`} style={{ ['--i' as string]: index }}>
      <div ref={ref} className="study__frame" onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="study__art">
          {study.variant === 'number' && <span className="study__numeral">{team.number}</span>}
          {study.variant === 'blueprint' && <span className="study__dims mono">PLAN · EDGE PASS</span>}
          {seen && (
            <img
              className="study__still"
              src={`/studies/${team.id}-${study.id}.webp`}
              alt={`${study.title} study of the ${team.label.toLowerCase()} car`}
              decoding="async"
              draggable={false}
            />
          )}
          {study.variant === 'rim' && <span className="study__halftone" />}
        </div>
      </div>
      <figcaption className="study__cap">
        <span className="study__cap-title">{study.title}</span>
        <span className="study__cap-meta mono">
          {study.note} · <b>STUDY {study.id}</b>
        </span>
      </figcaption>
    </figure>
  )
}

export function Studies() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('.study', {
        y: 120,
        opacity: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: '.studies__grid', start: 'top 80%' },
      })
      gsap.to('.study:nth-child(2)', {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: '.studies__grid', start: 'top bottom', end: 'bottom top', scrub: true },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section id="studies" ref={root} className="studies" aria-labelledby="studies-title">
      <header className="studies__head">
        <h2 id="studies-title" className="studies__title">
          <span>Single-seater</span>
          <em>studies</em>
        </h2>
        <p className="studies__intro">
          One car, three render passes: toon ink, blueprint edges and a low-key rim light. Repainted in the active
          team colours with every sponsor mark stripped out.
        </p>
      </header>
      <div className="studies__grid">
        {STUDIES.map((s, i) => (
          <StudyCard key={s.id} study={s} index={i} />
        ))}
      </div>
    </section>
  )
}

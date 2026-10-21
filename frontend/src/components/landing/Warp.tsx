import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useTeam } from '../../theme/useTeam'
import { useInView } from '../../hooks/useInView'

gsap.registerPlugin(ScrollTrigger)

const WarpCar = lazy(() => import('./WarpCar'))

const STEPS = [
  { k: 'REPLAY', h: ['Rewind the', 'moment.'], p: 'Seek to any second of the race. Tower, intervals and race control rebuild the field at that exact instant.' },
  { k: 'COMPARE', h: ['Find the', 'difference.'], p: 'Two drivers, one distance axis. Speed, throttle and brake traces line up corner by corner.' },
  { k: 'DECIDE', h: ['Test the', 'decision.'], p: 'Strategy what-ifs live in a clearly labelled simulation layer — never dressed up as measured fact.' },
]

export function Warp() {
  const { team } = useTeam()
  const root = useRef<HTMLElement>(null)
  const progress = useRef(0)
  const [step, setStep] = useState(0)
  const [viewRef, inView, seen] = useInView<HTMLDivElement>('400px')

  useEffect(() => {
    if (!root.current) return
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress
        setStep(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length * 0.999)))
      },
    })
    return () => st.kill()
  }, [])

  return (
    <section id="warp" ref={root} className="warp" aria-labelledby="warp-title">
      <div className="warp__sticky" ref={viewRef}>
        <div className="warp__vignette" aria-hidden="true" />
        <div className="warp__car" aria-hidden="true">
          {seen && (
            <Suspense fallback={null}>
              <WarpCar team={team} progress={progress} paused={!inView} />
            </Suspense>
          )}
        </div>

        <div className="warp__ui">
          <p className="warp__kicker mono">02 · INSIDE THE REPLAY</p>
          <h2 id="warp-title" className="sr-only">
            Rewind the moment, find the difference, test the decision.
          </h2>
          <div className="warp__steps">
            {STEPS.map((s, i) => (
              <div key={s.k} className={`warp__step${i === step ? ' is-active' : ''}`} aria-hidden={i !== step}>
                <span className="warp__step-k mono">
                  {String(i + 1).padStart(2, '0')} / {s.k}
                </span>
                <p className="warp__step-h">
                  <span>{s.h[0]}</span>
                  <em>{s.h[1]}</em>
                </p>
                <p className="warp__step-p">{s.p}</p>
              </div>
            ))}
          </div>
          <ol className="warp__rail mono" aria-hidden="true">
            {STEPS.map((s, i) => (
              <li key={s.k} className={i <= step ? 'is-on' : ''}>
                <i />
                {s.k}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

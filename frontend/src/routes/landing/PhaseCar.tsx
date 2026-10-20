import { SingleSeater } from '../../components/svg/SingleSeater'
import './PhaseCar.css'

export function PhaseCar({ width = 340 }: { width?: number }) {
  return (
    <div className="gt-phasecar" aria-hidden="true">
      <div className="gt-phasecar__orbits">
        <svg viewBox="0 0 400 400" className="gt-phasecar__orbits-svg">
          <ellipse
            cx="200"
            cy="200"
            r="165"
            fill="none"
            stroke="var(--gt-data-chalk)"
            strokeOpacity="0.12"
            strokeWidth="1"
            strokeDasharray="3 12"
          />
          <ellipse
            cx="200"
            cy="200"
            r="128"
            fill="none"
            stroke="var(--gt-signal)"
            strokeOpacity="0.4"
            strokeWidth="1.5"
            strokeDasharray="140 660"
          />
          <ellipse
            cx="200"
            cy="200"
            r="92"
            fill="none"
            stroke="var(--gt-data-cyan)"
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeDasharray="70 460"
          />
        </svg>
      </div>

      <div className="gt-phasecar__stage" style={{ width }}>
        <div className="gt-phasecar__layer gt-phasecar__layer--ghost">
          <SingleSeater width={width} stroke="var(--gt-data-chalk)" accent="var(--gt-data-chalk)" />
        </div>
        <div className="gt-phasecar__layer gt-phasecar__layer--fill">
          <SingleSeater width={width} />
        </div>
      </div>
    </div>
  )
}

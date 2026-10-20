import { useEffect, useState } from 'react'
import './BootSequence.css'

const BOOT_LINES = [
  'INIT TELEMETRY REPLAY',
  'SESSION 9558 · SILVERSTONE 2024',
  'LOAD CACHED TIMING',
  'SYNC CLOCK',
  'READY',
]

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    const DURATION = 2200
    const start = performance.now()
    let raf = 0
    let cancelled = false
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setProgress(p)
      setVisibleLines(Math.min(BOOT_LINES.length, Math.floor(p * BOOT_LINES.length) + 1))
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else if (!cancelled) {
        onDone()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [onDone])

  const pct = Math.round(progress * 100)

  return (
    <div className="gt-boot" role="status" aria-live="polite">
      <div className="gt-boot__arcs" aria-hidden="true">
        <svg viewBox="0 0 400 400" className="gt-boot__arcs-svg">
          <ellipse
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke="var(--gt-data-chalk)"
            strokeOpacity="0.18"
            strokeWidth="1"
            strokeDasharray="4 10"
          />
          <ellipse
            cx="200"
            cy="200"
            r="110"
            fill="none"
            stroke="var(--gt-signal)"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeDasharray="120 620"
          />
          <ellipse
            cx="200"
            cy="200"
            r="70"
            fill="none"
            stroke="var(--gt-data-cyan)"
            strokeOpacity="0.28"
            strokeWidth="1"
            strokeDasharray="60 380"
          />
        </svg>
      </div>

      <div className="gt-boot__panel">
        <p className="gt-boot__banner mono">GRIDTRACE · TELEMETRY BOOT</p>
        <ul className="gt-boot__lines mono">
          {BOOT_LINES.slice(0, visibleLines).map((line) => (
            <li key={line} className="gt-boot__line">
              <span className="gt-boot__tick">›</span> {line}
            </li>
          ))}
        </ul>
        <div className="gt-boot__progress-row mono">
          <div
            className="gt-boot__progress"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Telemetry boot progress"
          >
            <span className="gt-boot__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="gt-boot__pct">{String(pct).padStart(3, '0')}%</span>
        </div>
      </div>
    </div>
  )
}

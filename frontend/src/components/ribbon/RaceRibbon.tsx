import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { useClock } from '../../store/clock'
import { formatClock } from '../../utils/format'
import type { RaceControlEvent } from '../../api/client'
import './RaceRibbon.css'

const SPEEDS = [0.5, 1, 2, 4]

type PinKind =
  | 'red'
  | 'yellow'
  | 'chequered'
  | 'green'
  | 'blue'
  | 'neutral'

function pinKind(ev: RaceControlEvent): PinKind {
  const s = `${ev.flag ?? ''} ${ev.category ?? ''}`.toLowerCase()
  if (s.includes('red')) return 'red'
  if (s.includes('yellow')) return 'yellow'
  if (s.includes('chequered') || s.includes('checkered')) return 'chequered'
  if (s.includes('green')) return 'green'
  if (s.includes('blue')) return 'blue'
  return 'neutral'
}

function clampPct(v: number): number {
  return Math.min(100, Math.max(0, v))
}

export function RaceRibbon({
  events,
  startMs,
}: {
  events: RaceControlEvent[]
  startMs: number
}) {
  const t = useClock((s) => s.t)
  const playing = useClock((s) => s.playing)
  const speed = useClock((s) => s.speed)
  const duration = useClock((s) => s.duration)
  const toggle = useClock((s) => s.toggle)
  const seek = useClock((s) => s.seek)
  const setSpeed = useClock((s) => s.setSpeed)

  const [expanded, setExpanded] = useState(false)

  const timed = useMemo(() => {
    const list: { ev: RaceControlEvent; t: number }[] = []
    for (const ev of events) {
      const ms = Date.parse(ev.date)
      if (!Number.isFinite(ms) || !Number.isFinite(startMs)) continue
      const sec = (ms - startMs) / 1000
      if (!Number.isFinite(sec) || sec < 0) continue
      list.push({ ev, t: sec })
    }
    list.sort((a, b) => a.t - b.t)
    return list
  }, [events, startMs])

  const prev = useMemo(() => {
    let best: { ev: RaceControlEvent; t: number } | null = null
    for (const item of timed) {
      if (item.t <= t - 0.05) best = item
      else break
    }
    return best
  }, [timed, t])

  const next = useMemo(() => {
    for (const item of timed) {
      if (item.t > t + 0.05) return item
    }
    return null
  }, [timed, t])

  const axisMarks = useMemo(() => {
    if (duration <= 0) return []
    return [0.25, 0.5, 0.75].map((frac) => ({
      frac,
      label: formatClock(duration * frac),
    }))
  }, [duration])

  const goPrev = () => {
    if (prev) seek(prev.t)
  }
  const goNext = () => {
    if (next) seek(next.t)
  }

  return (
    <div
      className={`rb${expanded ? ' rb--expanded' : ''}`}
      role="group"
      aria-label="Race ribbon timeline"
    >
      <div className="rb__transport">
        <button
          type="button"
          className="rb__btn"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <div className="rb__nav" role="group" aria-label="Event navigation">
          <button
            type="button"
            className="rb__btn"
            onClick={goPrev}
            aria-label="Previous race control event"
            aria-disabled={!prev}
            title={prev ? undefined : 'NO PRIOR EVENTS'}
          >
            <SkipBack size={13} />
          </button>
          <button
            type="button"
            className="rb__btn"
            onClick={goNext}
            aria-label="Next race control event"
            aria-disabled={!next}
            title={next ? undefined : 'NO UPCOMING EVENTS'}
          >
            <SkipForward size={13} />
          </button>
        </div>

        <div className="rb__lap" role="group" aria-label="Lap navigation">
          <button
            type="button"
            className="rb__btn"
            aria-disabled
            title="LAP BOUNDARIES UNAVAILABLE IN REPLAY API"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            className="rb__btn"
            aria-disabled
            title="LAP BOUNDARIES UNAVAILABLE IN REPLAY API"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="rb__readout mono">
          <span className="rb__time">{formatClock(t)}</span>
          <span className="rb__sep">/</span>
          <span className="rb__duration">{formatClock(duration)}</span>
        </div>

        <div className="rb__speeds" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={`rb__speed mono${s === speed ? ' rb__speed--on' : ''}`}
              onClick={() => setSpeed(s)}
              aria-pressed={s === speed}
            >
              {s}×
            </button>
          ))}
        </div>

        <button
          type="button"
          className="rb__btn rb__btn--expand"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse ribbon' : 'Expand ribbon'}
          aria-pressed={expanded}
        >
          {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      <div className="rb__track">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.5}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
          className="rb__range"
          aria-label="Race clock scrubber"
        />

        <div className="rb__pins" aria-hidden="false">
          {timed.map((item, i) => {
            const pct = duration > 0 ? clampPct((item.t / duration) * 100) : 0
            const kind = pinKind(item.ev)
            return (
              <button
                key={`${item.ev.date}-${i}`}
                type="button"
                className={`rb__pin rb__pin--${kind}${expanded ? ' rb__pin--labelled' : ''}`}
                style={{ left: `${pct}%` }}
                onClick={(e) => {
                  e.stopPropagation()
                  seek(item.t)
                }}
                aria-label={`${item.ev.message} at ${formatClock(item.t)}`}
              >
                <span className="rb__pin-shape" />
                {expanded && (
                  <span className="rb__pin-label mono">
                    {formatClock(item.t)} · {item.ev.message.slice(0, 48)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {expanded && (
          <div className="rb__axis mono" aria-hidden="true">
            {axisMarks.map((m) => (
              <span
                key={m.frac}
                className="rb__axis-tick"
                style={{ left: `${m.frac * 100}%` }}
              >
                <span className="rb__axis-line" />
                <span className="rb__axis-label">{m.label}</span>
              </span>
            ))}
          </div>
        )}

        {timed.length === 0 && (
          <div className="rb__empty mono">NO EVENTS RECORDED FOR THIS SESSION</div>
        )}
      </div>
    </div>
  )
}

import { Pause, Play } from 'lucide-react'
import { useClock } from '../../store/clock'
import { formatClock } from '../../utils/format'
import './ReplayControls.css'

const SPEEDS = [1, 2, 4, 8]

export function ReplayControls() {
  const t = useClock((s) => s.t)
  const playing = useClock((s) => s.playing)
  const speed = useClock((s) => s.speed)
  const duration = useClock((s) => s.duration)
  const toggle = useClock((s) => s.toggle)
  const seek = useClock((s) => s.seek)
  const setSpeed = useClock((s) => s.setSpeed)

  return (
    <div className="replay" role="group" aria-label="Replay controls">
      <button
        type="button"
        className="replay__play"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <div className="replay__scrub">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.5}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
          className="replay__range"
          aria-label="Race clock scrubber"
        />
      </div>

      <div className="replay__readout mono" aria-live="off">
        <span className="replay__time">{formatClock(t)}</span>
        <span className="replay__sep">/</span>
        <span className="replay__duration">{formatClock(duration)}</span>
      </div>

      <div className="replay__speeds" role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`replay__speed mono${s === speed ? ' replay__speed--active' : ''}`}
            onClick={() => setSpeed(s)}
            aria-pressed={s === speed}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  )
}

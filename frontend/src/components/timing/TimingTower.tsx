import type { TimingRow } from '../../api/client'
import { formatCompound, formatLapMs } from '../../utils/format'
import './TimingTower.css'

export function TimingTower({
  rows,
  colours,
  teams,
  markerMode,
}: {
  rows: TimingRow[]
  colours: Map<number, string>
  teams?: Map<number, string>
  markerMode?: string
}) {
  return (
    <section className="tower" aria-label="Timing tower">
      <header className="tower__header">
        <span className="tower__col tower__col--pos mono">POS</span>
        <span className="tower__col tower__col--drv mono">DRV</span>
        <span className="tower__col tower__col--team">TEAM</span>
        <span className="tower__col tower__col--int mono">INT</span>
        <span className="tower__col tower__col--gap mono">GAP</span>
        <span className="tower__col tower__col--last mono">LAST</span>
        <span className="tower__col tower__col--tyre mono">TYR</span>
      </header>
      {rows.length === 0 ? (
        <div className="tower__empty mono">NO TIMING DATA</div>
      ) : (
        <div className="tower__rows">
          {rows.map((row) => (
            <div key={row.driver_number} className="tower__row">
              <span className="tower__col tower__col--pos mono">{row.position}</span>
              <span className="tower__col tower__col--drv">
                <span
                  className="tower__colour-bar"
                  style={{ background: colours.get(row.driver_number) ?? 'var(--gt-border-strong)' }}
                />
                <span className="tower__acronym mono">{row.name_acronym}</span>
              </span>
              <span className="tower__col tower__col--team">
                <span className="tower__team-name">{teams?.get(row.driver_number) ?? '—'}</span>
              </span>
              <span className="tower__col tower__col--int mono">{row.interval ?? '—'}</span>
              <span className="tower__col tower__col--gap mono">{row.gap_to_leader ?? '—'}</span>
              <span className="tower__col tower__col--last mono">{formatLapMs(row.last_lap_ms)}</span>
              <span className="tower__col tower__col--tyre mono">
                <span className={`tower__tyre tower__tyre--${compoundKey(row.compound)}`}>
                  {formatCompound(row.compound)}
                </span>
                {row.tyre_age != null && (
                  <span className="tower__tyre-age mono">{row.tyre_age}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {markerMode && markerMode !== 'REPLAY' && (
        <div className="tower__marker-mode mono">
          <span className={`badge badge-${markerMode.toLowerCase()}`}>{markerMode}</span>
          <span className="tower__marker-note">marker mode</span>
        </div>
      )}
    </section>
  )
}

function compoundKey(c: string | null): string {
  if (!c) return 'none'
  const k = c.toUpperCase()
  if (k === 'SOFT') return 's'
  if (k === 'MEDIUM') return 'm'
  if (k === 'HARD') return 'h'
  if (k === 'INTERMEDIATE') return 'i'
  if (k === 'WET') return 'w'
  return 'none'
}

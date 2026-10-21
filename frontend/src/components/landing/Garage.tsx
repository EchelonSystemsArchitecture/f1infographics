import { Suspense, lazy, useState } from 'react'
import { useTeam } from '../../theme/useTeam'
import { TEAMS, TEAM_ORDER } from '../../theme/teams'
import { useInView } from '../../hooks/useInView'
import { PU_PARTS } from '../three/puParts'
import type { GarageView } from '../three/GarageScene'

const GarageScene = lazy(() => import('../three/GarageScene'))

export function Garage() {
  const { team, setTeam } = useTeam()
  const [view, setView] = useState<GarageView>('car')
  const [part, setPart] = useState<string | null>(null)
  const [ref, inView, seen] = useInView<HTMLDivElement>('400px')
  const active = PU_PARTS.find((p) => p.id === part)

  return (
    <section id="garage" className="garage" aria-labelledby="garage-title">
      <header className="garage__head">
        <div>
          <p className="garage__kicker mono">01 · THE GARAGE</p>
          <h2 id="garage-title" className="garage__title">
            Open the <em>garage.</em>
          </h2>
        </div>
        <p className="garage__intro">
          A low-poly diorama of race weekend: the car, the tyre stacks, the trophy cabinet and a wall screen
          tracing the real Silverstone layout from our circuit data. Drag to orbit. Then pull the engine cover.
        </p>
      </header>

      <div className="garage__stage" ref={ref}>
        {seen && (
          <Suspense fallback={<div className="garage__loading mono">ASSEMBLING GARAGE…</div>}>
            <GarageScene team={team} view={view} paused={!inView} activePart={part} onSelectPart={setPart} />
          </Suspense>
        )}

        <div className="garage__hud garage__hud--tl">
          <div className="seg" role="group" aria-label="Garage view">
            <button type="button" className={view === 'car' ? 'is-on' : ''} aria-pressed={view === 'car'} onClick={() => (setView('car'), setPart(null))}>
              Car
            </button>
            <button type="button" className={view === 'engine' ? 'is-on' : ''} aria-pressed={view === 'engine'} onClick={() => setView('engine')}>
              Power unit
            </button>
          </div>
        </div>

        <div className="garage__hud garage__hud--tr">
          <p className="garage__hud-k mono">TEAM THEME</p>
          <div className="garage__teams" role="group" aria-label="Team theme">
            {TEAM_ORDER.map((id) => {
              const t = TEAMS[id]
              return (
                <button
                  key={id}
                  type="button"
                  className={`chip${t.id === team.id ? ' is-on' : ''}`}
                  disabled={!t.available}
                  aria-pressed={t.id === team.id}
                  onClick={() => setTeam(id)}
                  title={t.available ? `${t.team} colours` : 'Coming soon'}
                >
                  <i style={{ background: t.colors.primary }} />
                  {t.label}
                  {!t.available && <small>SOON</small>}
                </button>
              )
            })}
          </div>
        </div>

        <aside className={`garage__panel${view === 'engine' ? ' is-open' : ''}`} aria-hidden={view !== 'engine'}>
          <p className="garage__hud-k mono">POWER UNIT · EXPLODED</p>
          <ul>
            {PU_PARTS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  tabIndex={view === 'engine' ? 0 : -1}
                  className={part === p.id ? 'is-on' : ''}
                  onClick={() => setPart(part === p.id ? null : p.id)}
                >
                  <span className="mono">{p.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="garage__note">{active ? active.note : 'Select a component to highlight it on the car.'}</p>
        </aside>

        {team.profile && (
          <div className="garage__team">
            <p className="garage__hud-k mono">TEAM FILE · REFERENCE</p>
            <p className="garage__team-name">
              <i style={{ background: team.colors.primary }} />
              {team.profile.name}
            </p>
            <dl className="garage__team-facts">
              <div>
                <dt className="mono">BASE</dt>
                <dd>{team.profile.base}</dd>
              </div>
              <div>
                <dt className="mono">FOUNDED</dt>
                <dd>
                  {team.profile.founded} · {team.profile.founder}
                </dd>
              </div>
              <div>
                <dt className="mono">POWER UNIT</dt>
                <dd>{team.profile.powerUnit}</dd>
              </div>
              <div>
                <dt className="mono">DRIVERS</dt>
                <dd>
                  {team.profile.drivers.map((d) => (
                    <span key={d.number} className="garage__driver">
                      <b className="mono">{d.number}</b> {d.name}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="garage__team-blurb">{team.profile.blurb}</p>
          </div>
        )}

        <p className="garage__hint mono" aria-hidden="true">
          DRAG ⟷ ORBIT
        </p>
      </div>
    </section>
  )
}

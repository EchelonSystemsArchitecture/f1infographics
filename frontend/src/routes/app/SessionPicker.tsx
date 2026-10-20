import { useEffect, useState } from 'react'
import { api, type EventSummary, type SeasonSummary } from '../../api/client'
import './SessionPicker.css'

interface EventsState {
  season: number
  events: EventSummary[]
  error: string | null
}

export function SessionPicker({ onPick }: { onPick: (sessionKey: number) => void }) {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([])
  const [season, setSeason] = useState<number | null>(null)
  const [eventsState, setEventsState] = useState<EventsState | null>(null)
  const [seasonsError, setSeasonsError] = useState<string | null>(null)
  const [loadingSeasons, setLoadingSeasons] = useState(true)

  const effectiveSeason =
    season ?? (seasons.length > 0 ? Math.max(...seasons.map((s) => s.year)) : null)

  const loadedForCurrent = eventsState != null && eventsState.season === effectiveSeason
  const events = eventsState && eventsState.season === effectiveSeason ? eventsState.events : []
  const error = eventsState && eventsState.season === effectiveSeason ? eventsState.error : seasonsError
  const loadingEvents = effectiveSeason != null && !loadedForCurrent

  useEffect(() => {
    let cancelled = false
    api
      .seasons()
      .then((list) => {
        if (cancelled) return
        setSeasons([...list].sort((a, b) => b.year - a.year))
        setLoadingSeasons(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setSeasonsError(e instanceof Error ? e.message : String(e))
        setLoadingSeasons(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (effectiveSeason == null) return
    let cancelled = false
    api
      .yearEvents(effectiveSeason)
      .then((page) => {
        if (cancelled) return
        setEventsState({ season: effectiveSeason, events: page.events, error: null })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setEventsState({
          season: effectiveSeason,
          events: [],
          error: e instanceof Error ? e.message : String(e),
        })
      })
    return () => {
      cancelled = true
    }
  }, [effectiveSeason])

  const loading = loadingSeasons || loadingEvents

  return (
    <div className="picker">
      <div className="picker__inner">
        <h2 className="picker__title">Choose a session</h2>
        <p className="picker__intro">
          GRIDTRACE replays historical race data. Every number on screen is traceable to a
          cached API response — nothing is simulated. Seasons with cached coverage replay
          fully; other events show their available data channels honestly.
        </p>
        {!loadingSeasons && seasons.length > 0 && (
          <div className="picker__season-row">
            <label className="picker__item-meta" htmlFor="picker-season">
              SEASON
            </label>
            <select
              id="picker-season"
              className="picker__season"
              value={effectiveSeason ?? ''}
              onChange={(e) => setSeason(Number(e.target.value))}
            >
              {seasons.map((s) => (
                <option key={s.year} value={s.year}>
                  {s.year}
                </option>
              ))}
            </select>
          </div>
        )}
        {loading && <div className="picker__state mono">LOADING…</div>}
        {error && (
          <div className="picker__state picker__state--error mono" role="alert">
            FAILED TO LOAD CATALOG · {error}
          </div>
        )}
        {!loading && !error && events.length === 0 && (
          <div className="picker__state mono">NO EVENTS FOR THIS SEASON</div>
        )}
        {!loading && !error && events.length > 0 && (
          <ul className="picker__list">
            {events.map((ev) => {
              const key = ev.session_key
              const canPick = ev.ingested && key != null
              return (
                <li key={`${ev.season}-${ev.round}`}>
                  <button
                    type="button"
                    className={`picker__item${canPick ? '' : ' picker__item--disabled'}`}
                    disabled={!canPick}
                    onClick={() => canPick && key != null && onPick(key)}
                  >
                    <span className="picker__item-name">
                      {ev.round}. {ev.event_name}
                    </span>
                    <span className="picker__item-meta mono">
                      {ev.circuit_name} · {ev.country}
                    </span>
                    <span className="picker__item-side">
                      {canPick ? (
                        <>
                          <span className="badge badge-replay">REPLAY</span>
                          <span className="picker__availability mono">CACHED COVERAGE</span>
                        </>
                      ) : (
                        <span className="picker__availability mono">NOT INGESTED</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TEAMS, type TeamId } from './teams'
import { ThemeCtx, type ThemeValue } from './useTeam'

export function TeamThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<TeamId>('papaya')
  const team = TEAMS[id]

  useEffect(() => {
    const root = document.documentElement
    root.dataset.team = team.id
    const c = team.colors
    root.style.setProperty('--team-primary', c.primary)
    root.style.setProperty('--team-primary-ink', c.primaryInk)
    root.style.setProperty('--team-secondary', c.secondary)
    root.style.setProperty('--team-ink', c.ink)
    root.style.setProperty('--team-paper', c.paper)
    root.style.setProperty('--team-dark', c.dark)
    root.style.setProperty('--team-darker', c.darker)
  }, [team])

  const value = useMemo<ThemeValue>(
    () => ({
      team,
      setTeam: (next) => {
        if (TEAMS[next].available) setId(next)
      },
    }),
    [team],
  )

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

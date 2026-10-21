import { createContext, useContext } from 'react'
import type { TeamId, TeamTheme } from './teams'

export interface ThemeValue {
  team: TeamTheme
  setTeam: (id: TeamId) => void
}

export const ThemeCtx = createContext<ThemeValue | null>(null)

export function useTeam() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTeam must be used inside TeamThemeProvider')
  return ctx
}

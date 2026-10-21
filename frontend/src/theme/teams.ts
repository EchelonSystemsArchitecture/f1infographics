export type TeamId = 'papaya' | 'scarlet' | 'midnight' | 'silver' | 'racing-green'

export interface TeamLivery {
  body: string
  accent: string
  secondary: string
  carbon: string
  number: string
}

export interface TeamProfile {
  name: string
  base: string
  founded: string
  founder: string
  powerUnit: string
  drivers: { name: string; number: number }[]
  blurb: string
}

export interface TeamTheme {
  profile?: TeamProfile
  id: TeamId
  label: string
  team: string
  available: boolean
  number: number
  colors: {
    primary: string
    primaryInk: string
    secondary: string
    ink: string
    paper: string
    dark: string
    darker: string
  }
  livery: TeamLivery
}

export const TEAMS: Record<TeamId, TeamTheme> = {
  papaya: {
    id: 'papaya',
    label: 'PAPAYA',
    team: 'McLaren',
    available: true,
    profile: {
      name: 'McLaren Formula 1 Team',
      base: 'Woking, United Kingdom',
      founded: '1963',
      founder: 'Bruce McLaren',
      powerUnit: 'Mercedes',
      drivers: [
        { name: 'Lando Norris', number: 4 },
        { name: 'Oscar Piastri', number: 81 },
      ],
      blurb: 'Founded by a racing driver, built in Woking, painted papaya since the start. The orange is a heritage colour going back to the 1960s cars.',
    },
    number: 4,
    colors: {
      primary: '#ff8000',
      primaryInk: '#140a00',
      secondary: '#3fc5ff',
      ink: '#121212',
      paper: '#f1ece4',
      dark: '#161513',
      darker: '#0c0b0a',
    },
    livery: {
      body: '#ff8000',
      accent: '#1b1b1d',
      secondary: '#3fc5ff',
      carbon: '#141416',
      number: '#121212',
    },
  },
  scarlet: {
    id: 'scarlet',
    label: 'SCARLET',
    team: 'Ferrari',
    available: false,
    number: 16,
    colors: {
      primary: '#e8002d',
      primaryInk: '#fff4f0',
      secondary: '#ffdd00',
      ink: '#121212',
      paper: '#f3ede8',
      dark: '#170f0f',
      darker: '#0d0909',
    },
    livery: {
      body: '#d4001f',
      accent: '#f5f5f5',
      secondary: '#ffdd00',
      carbon: '#141416',
      number: '#f5f5f5',
    },
  },
  midnight: {
    id: 'midnight',
    label: 'MIDNIGHT',
    team: 'Red Bull',
    available: false,
    number: 1,
    colors: {
      primary: '#3671c6',
      primaryInk: '#f4f6ff',
      secondary: '#ffc906',
      ink: '#121212',
      paper: '#ecedf2',
      dark: '#0f1220',
      darker: '#080a14',
    },
    livery: {
      body: '#1e2a4f',
      accent: '#e10600',
      secondary: '#ffc906',
      carbon: '#141416',
      number: '#ffc906',
    },
  },
  silver: {
    id: 'silver',
    label: 'SILVER',
    team: 'Mercedes',
    available: false,
    number: 63,
    colors: {
      primary: '#27f4d2',
      primaryInk: '#04130f',
      secondary: '#c8ccce',
      ink: '#121212',
      paper: '#eef0ef',
      dark: '#101413',
      darker: '#090b0b',
    },
    livery: {
      body: '#c8ccce',
      accent: '#101213',
      secondary: '#27f4d2',
      carbon: '#141416',
      number: '#101213',
    },
  },
  'racing-green': {
    id: 'racing-green',
    label: 'RACING GREEN',
    team: 'Aston Martin',
    available: false,
    number: 14,
    colors: {
      primary: '#229971',
      primaryInk: '#f1fff8',
      secondary: '#cedc00',
      ink: '#121212',
      paper: '#edf0ec',
      dark: '#0d1512',
      darker: '#070c0a',
    },
    livery: {
      body: '#0b5c45',
      accent: '#cedc00',
      secondary: '#f2f2f2',
      carbon: '#141416',
      number: '#f2f2f2',
    },
  },
}

export const TEAM_ORDER: TeamId[] = ['papaya', 'scarlet', 'midnight', 'silver', 'racing-green']

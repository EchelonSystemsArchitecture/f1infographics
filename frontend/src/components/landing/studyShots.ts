import type { StudyShot } from './StudyCanvas'

export interface Study {
  id: string
  title: string
  note: string
  variant: 'number' | 'blueprint' | 'rim'
  shot: StudyShot
}

export const STILL = { w: 420, h: 560 }


export const STUDIES: Study[] = [
  {
    id: '01',
    title: 'Number',
    note: 'Toon shade, ink outline',
    variant: 'number',
    shot: { mode: 'toon', camera: [5, 7, 5], rotation: [0, 0.5, 0], zoom: 70, line: '#111111' },
  },
  {
    id: '02',
    title: 'Blueprint',
    note: 'Edge pass, plan view',
    variant: 'blueprint',
    shot: { mode: 'blueprint', camera: [3, 9, 4], rotation: [0, -0.45, 0], zoom: 64, line: '#ffffff' },
  },
  {
    id: '03',
    title: 'Rim light',
    note: 'Two-tone studio, low key',
    variant: 'rim',
    shot: { mode: 'standard', camera: [-1.6, 1.1, 7], rotation: [0, 0.2, 0], zoom: 74, line: '#111', lights: 'rim' },
  },
]


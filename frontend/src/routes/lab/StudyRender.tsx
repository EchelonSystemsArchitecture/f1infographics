import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StudyCanvas from '../../components/landing/StudyCanvas'
import { STILL, STUDIES } from '../../components/landing/studyShots'
import { TEAMS, type TeamId } from '../../theme/teams'

declare global {
  interface Window {
    setStudyAngle?: (a: number) => void
  }
}

export function StudyRender() {
  const [p] = useSearchParams()
  const study = STUDIES[Number(p.get('i') ?? 0)]
  const team = TEAMS[(p.get('team') as TeamId) ?? 'papaya']
  const [angle, setAngle] = useState(0)

  useEffect(() => {
    window.setStudyAngle = setAngle
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    const root = document.getElementById('root')
    if (root) root.style.background = 'transparent'
    return () => {
      delete window.setStudyAngle
    }
  }, [])

  return (
    <div id="study-frame" style={{ width: STILL.w, height: STILL.h, position: 'relative' }}>
      <Suspense fallback={null}>
        <StudyCanvas team={team} shot={study.shot} angle={angle} />
      </Suspense>
    </div>
  )
}

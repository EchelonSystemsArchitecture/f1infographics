import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './routes/app/AppShell'
import { Landing } from './routes/landing/Landing'

const Lab = lazy(() => import('./routes/lab/Lab').then((m) => ({ default: m.Lab })))
const StudyRender = lazy(() => import('./routes/lab/StudyRender').then((m) => ({ default: m.StudyRender })))
const FerroLab = lazy(() => import('./routes/lab/Ferro').then((m) => ({ default: m.FerroLab })))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/lab" element={<Lab />} />
        <Route path="/lab/study" element={<StudyRender />} />
        <Route path="/lab/ferro" element={<FerroLab />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

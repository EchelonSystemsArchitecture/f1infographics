import { Navigate, Route, Routes } from 'react-router-dom'
import { Landing } from './routes/landing/Landing'
import { AppShell } from './routes/app/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

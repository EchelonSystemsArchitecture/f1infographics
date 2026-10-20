import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './routes/app/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app/*" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

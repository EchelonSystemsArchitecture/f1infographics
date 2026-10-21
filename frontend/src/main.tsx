import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/public-sans'
import '@fontsource-variable/inter'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/tokens.css'
import './index.css'
import './styles/app-theme.css'
import { TeamThemeProvider } from './theme/ThemeContext'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TeamThemeProvider>
        <App />
      </TeamThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

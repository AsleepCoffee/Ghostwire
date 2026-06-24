import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { SettingsProvider } from './lib/settings'
import { ConfirmProvider } from './lib/confirm'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <ConfirmProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </ConfirmProvider>
    </SettingsProvider>
  </React.StrictMode>
)

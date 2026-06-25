import { Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { TitleBar } from './components/TitleBar'
import { UpdateNotice } from './components/UpdateNotice'
import { PersonaDock } from './components/PersonaDock'
import { PersonaDockProvider } from './lib/dock'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { SockPuppets } from './pages/SockPuppets'
import { Browser } from './pages/Browser'
import { Notes } from './pages/Notes'
import { Tools } from './pages/Tools'
import { Graph } from './pages/Graph'
import { Dork } from './pages/Dork'
import { Mailbox } from './pages/Mailbox'
import { EvidencePage } from './pages/Evidence'
import { Enumerate } from './pages/Enumerate'
import { Timeline } from './pages/Timeline'
import { Vpn } from './pages/Vpn'
import { WhatsNew } from './pages/WhatsNew'
import { Settings } from './pages/Settings'

export default function App(): JSX.Element {
  const loc = useLocation()
  const onBrowser = loc.pathname === '/browser'

  return (
    <PersonaDockProvider>
    <div className="flex flex-col h-full w-full overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <UpdateNotice />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 min-h-0 relative overflow-hidden">
          {/* Routed pages — hidden (not unmounted) while the browser is showing. */}
          <div className="absolute inset-0 overflow-hidden" style={{ display: onBrowser ? 'none' : 'block' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/sock-puppets" element={<SockPuppets />} />
              <Route path="/browser" element={null} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/dork" element={<Dork />} />
              <Route path="/mailbox" element={<Mailbox />} />
              <Route path="/evidence" element={<EvidencePage />} />
              <Route path="/enumerate" element={<Enumerate />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/graph" element={<Graph />} />
              <Route path="/vpn" element={<Vpn />} />
              <Route path="/whats-new" element={<WhatsNew />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
          {/* Persistent browser — always mounted so tabs/sessions survive navigation. */}
          <div className="absolute inset-0" style={{ display: onBrowser ? 'block' : 'none' }}>
            <Browser />
          </div>
          </main>
        </div>
      </div>
      <PersonaDock />
    </div>
    </PersonaDockProvider>
  )
}

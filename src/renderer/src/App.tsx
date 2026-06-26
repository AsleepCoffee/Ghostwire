import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { api } from './lib/api'
import { setBrowserNavigator, openInAppBrowser } from './lib/browserBus'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { TitleBar } from './components/TitleBar'
import { UpdateNotice } from './components/UpdateNotice'
import { PersonaDock, InvestigationDock } from './components/PersonaDock'
import { PersonaDockProvider } from './lib/dock'
import { CommandPalette } from './components/CommandPalette'
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
import { ExamPrep } from './pages/ExamPrep'
import { MapView } from './pages/MapView'
import { Intel } from './pages/Intel'
import { InfraIntel } from './pages/InfraIntel'
import { Vpn } from './pages/Vpn'
import { WhatsNew } from './pages/WhatsNew'
import { Settings } from './pages/Settings'

/** Registers the in-app browser as the sink for every link-open request, so
 *  nothing is ever handed to the system browser. */
function BrowserRouting(): null {
  const navigate = useNavigate()
  useEffect(() => {
    setBrowserNavigator((path) => navigate(path))
    const off = api.browser.onOpen((urls) => openInAppBrowser(urls))
    return () => {
      setBrowserNavigator(null)
      off()
    }
  }, [navigate])
  return null
}

export default function App(): JSX.Element {
  const loc = useLocation()
  const onBrowser = loc.pathname === '/browser'

  return (
    <PersonaDockProvider>
    <BrowserRouting />
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
              <Route path="/exam-prep" element={<ExamPrep />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/intel" element={<Intel />} />
              <Route path="/infra" element={<InfraIntel />} />
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
      <InvestigationDock />
      <CommandPalette />
    </div>
    </PersonaDockProvider>
  )
}

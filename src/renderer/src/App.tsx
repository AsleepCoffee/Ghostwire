import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Dashboard } from './pages/Dashboard'
import { SockPuppets } from './pages/SockPuppets'
import { Browser } from './pages/Browser'
import { Notes } from './pages/Notes'
import { Tools } from './pages/Tools'
import { Graph } from './pages/Graph'
import { Dork } from './pages/Dork'
import { Settings } from './pages/Settings'

export default function App(): JSX.Element {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sock-puppets" element={<SockPuppets />} />
            <Route path="/browser" element={<Browser />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/dork" element={<Dork />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

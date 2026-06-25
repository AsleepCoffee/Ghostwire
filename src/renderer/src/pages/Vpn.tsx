import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ShieldCheck, ExternalLink, Fingerprint, ArrowRight, Globe2 } from 'lucide-react'
import { api, type VpnState, type Persona } from '../lib/api'
import { VpnManager, vpnReady } from '../components/VpnManager'
import { personaColor } from '../lib/constants'

const PROTON_WG = 'https://account.protonvpn.com/downloads'

const STEPS = [
  {
    title: 'Open Proton → WireGuard configuration',
    body: 'In your Proton account go to Downloads → WireGuard configuration (the “Open Proton downloads” button below). You’ll generate one config file per country you want to exit from.'
  },
  {
    title: 'Set the options exactly like this',
    body: 'Device/certificate name: anything (e.g. ghostwire-germany). Platform: choose GNU/Linux (gives the cleanest config for GhostWire — Windows also works). NetShield: your choice (e.g. “Block malware only”). Moderate NAT: OFF. NAT-PMP (Port Forwarding): OFF. VPN Accelerator: ON (default). These last three are the defaults, so usually you only need to set the Platform.'
  },
  {
    title: 'Pick a country and click Create',
    body: 'Under “Select a server to connect to”, expand a country and pick a server (or use the recommended one at the top), then click Create and download the .conf. Repeat for each exit location — you can run several at once (up to your plan’s device limit).'
  },
  {
    title: 'Install the engine & import the configs here',
    body: 'If prompted below, click “Download & install engine” (one click — GhostWire fetches the helper for you). Then click “Import .conf” and select your downloaded file(s). GhostWire runs a userspace tunnel per config as a local SOCKS5 proxy — no admin rights, no change to your system connection.'
  },
  {
    title: 'Assign a country to each persona',
    body: 'On a sock puppet, pick its VPN exit country. That persona’s browser tabs then route out of that country — so two personas can appear in two different countries simultaneously.'
  }
]

export function Vpn(): JSX.Element {
  const [state, setState] = useState<VpnState | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    api.vpn.state().then(setState)
    api.personas.list().then(setPersonas)
    return api.vpn.onStatus(setState)
  }, [])

  const ready = vpnReady(state)
  const configById = new Map((state?.configs ?? []).map((c) => [c.id, c]))
  const assigned = personas.filter((p) => p.vpnConfigId && configById.has(p.vpnConfigId))

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Shield size={22} className="text-brand-glow" /> VPN exit locations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Route each sock puppet through a different country at the same time, using your Proton VPN.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${
              ready ? 'bg-ok/15 text-ok border-ok/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            }`}
          >
            {ready ? 'Active' : 'Not set up'}
          </span>
        </div>

        {/* Setup guide — shown prominently until at least one tunnel is live. */}
        {!ready && (
          <section className="card p-5">
            <h2 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <Globe2 size={16} className="text-brand-glow" /> Set up in a few steps
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              You’ll need a Proton VPN subscription. Configs are WireGuard files you download from your account.
            </p>
            <ol className="space-y-3">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-brand/15 text-brand-glow text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-200">{s.title}</div>
                    <div className="text-sm text-slate-500">{s.body}</div>
                  </div>
                </li>
              ))}
            </ol>
            <button
              className="btn-ghost border border-ink-600 mt-4"
              onClick={() => api.shell.openExternal(PROTON_WG)}
            >
              <ExternalLink size={15} /> Open Proton downloads
            </button>
          </section>
        )}

        {/* Manage tunnels */}
        <section className="card p-5">
          <h2 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-glow" /> Your exit locations
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Each imported config becomes a local SOCKS5 exit. A persona assigned to an exit fails closed — if its
            tunnel is down, its tabs won’t load rather than leak your real IP.
          </p>
          <VpnManager onChange={() => api.personas.list().then(setPersonas)} />
        </section>

        {/* Persona → country mapping */}
        {ready && (
          <section className="card p-5">
            <h2 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
              <Fingerprint size={16} className="text-brand-glow" /> Persona exits
            </h2>
            {assigned.length === 0 ? (
              <p className="text-sm text-slate-500 mt-2">
                No personas are assigned to an exit yet. Open a sock puppet and pick its VPN exit country.{' '}
                <button className="text-brand-glow hover:underline" onClick={() => navigate('/sock-puppets')}>
                  Go to Sock Puppets
                </button>
              </p>
            ) : (
              <div className="space-y-1.5 mt-2">
                {assigned.map((p) => {
                  const c = configById.get(p.vpnConfigId!)!
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <Fingerprint size={14} style={{ color: personaColor(p.id) }} />
                      <span className="text-slate-200">{p.name}</span>
                      <ArrowRight size={13} className="text-slate-600" />
                      <span className="text-slate-300">{c.name}</span>
                      <span className={`ml-auto w-2 h-2 rounded-full ${c.running ? 'bg-ok' : 'bg-danger'}`} />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

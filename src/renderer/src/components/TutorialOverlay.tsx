import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useSettings } from '../lib/settings'

interface Step {
  path: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    path: '/',
    title: 'Welcome to GhostWire',
    body: "GhostWire is your all-in-one OSINT workstation. You'll manage investigations, build sock puppet identities, collect evidence, and run research tools — all in one place. Let's take a quick tour."
  },
  {
    path: '/projects',
    title: 'Investigations',
    body: 'Every operation starts with a case. Create an investigation to organize your target, evidence, entity graph, timeline, and notes. Set one as active to use it as your working context across the whole app.'
  },
  {
    path: '/evidence',
    title: 'Evidence Board',
    body: 'Drop screenshots, images, and files here. GhostWire extracts EXIF metadata, computes SHA-256 hashes, and links everything to your case. Filter, sort, and preview directly in the board.'
  },
  {
    path: '/graph',
    title: 'Graph Workspace',
    body: 'The link chart maps connections between entities — people, emails, phones, usernames, and domains. Drag nodes, add relationships, and export an interactive chart in your HTML reports.'
  },
  {
    path: '/timeline',
    title: 'Case Timeline',
    body: 'Build a chronological picture of your investigation. Log key events, tag evidence, and see your whole case sequence at a glance to spot patterns and gaps.'
  },
  {
    path: '/sock-puppets',
    title: 'Sock Puppets',
    body: 'Create and manage OSINT personas — each with a full fake identity, generated credentials, and an isolated browser session. Pin a persona to the side dock for quick reference while you browse.'
  },
  {
    path: '/browser',
    title: 'Browser',
    body: 'Browse the web anonymously through any sock puppet. Each persona runs in its own isolated session with a spoofed fingerprint so sites cannot link your activity back to a real identity.'
  },
  {
    path: '/mailbox',
    title: 'Mailbox',
    body: "Give your personas a real inbox. Set up a catch-all email domain and receive messages directly through the Mailbox tab — the persona's webmail opens right inside GhostWire."
  },
  {
    path: '/intel',
    title: 'Research Tools',
    body: "The Research section packs in email & phone lookups, domain and IP intelligence, account finders, Reddit archiving, proximity analysis, and more — everything you'd normally tab between is right here in the sidebar."
  },
  {
    path: '/vpn',
    title: 'VPN',
    body: 'Import WireGuard configs to route your traffic through a VPN. Keep your real IP hidden during research — especially important when browsing through sock puppet sessions.'
  },
  {
    path: '/settings',
    title: "You're All Set",
    body: 'Configure your vault path, API keys, appearance, and backups from the Settings page. You can restart this tutorial any time by clicking "Restart tutorial" in the Appearance section.'
  }
]

interface TutorialOverlayProps {
  onClose: () => void
}

export function TutorialOverlay({ onClose }: TutorialOverlayProps): JSX.Element {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const { settings, update } = useSettings()
  // Capture first-time state at mount — doesn't change as the tutorial runs
  const [isFirstTime] = useState(!settings.tutorialCompleted)

  useEffect(() => {
    navigate(STEPS[step].path)
  }, [step, navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const finish = (): void => {
    update({ tutorialCompleted: true })
    onClose()
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    /* No backdrop — page content is fully visible so you can see each section */
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[71] w-full max-w-lg px-4 pointer-events-none">
      <div className="card !bg-ink-900/95 shadow-2xl border-ink-500 ring-1 ring-brand/20 p-5 pointer-events-auto">

        {/* First-time greeting banner — only on step 1, only on first install */}
        {isFirstTime && step === 0 && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-brand/10 border border-brand/20">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-glow animate-pulse shrink-0" />
            <span className="text-xs text-brand-glow font-medium">
              We noticed it&apos;s your first time here — let us show you around.
            </span>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
              Step {step + 1} of {STEPS.length}
            </div>
            <h3 className="text-base font-semibold text-slate-100">{current.title}</h3>
          </div>
          <button
            className="btn-ghost !p-1.5 shrink-0 text-slate-500 hover:text-slate-300"
            title="Skip tutorial"
            onClick={finish}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4">{current.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-4 bg-brand-glow'
                  : i < step
                  ? 'w-1.5 bg-brand-glow/40'
                  : 'w-1.5 bg-ink-600'
              }`}
              title={STEPS[i].title}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-2">
          <button className="btn-ghost text-sm" onClick={finish}>
            Skip
          </button>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-sm flex items-center gap-1"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft size={15} /> Back
            </button>
            {isLast ? (
              <button className="btn-primary text-sm" onClick={finish}>
                Finish
              </button>
            ) : (
              <button
                className="btn-primary text-sm flex items-center gap-1"
                onClick={() => setStep((s) => s + 1)}
              >
                Next <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

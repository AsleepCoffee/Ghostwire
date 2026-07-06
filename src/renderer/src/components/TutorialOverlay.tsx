import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useSettings } from '../lib/settings'

type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

const SKILL_LEVELS: { id: SkillLevel; label: string; detail: string }[] = [
  { id: 'beginner', label: 'New to OSINT', detail: "I'm just getting started" },
  { id: 'intermediate', label: 'Some experience', detail: "I've done basic research" },
  { id: 'advanced', label: 'Experienced', detail: 'I run investigations regularly' }
]

interface Step {
  path: string
  title: string
  body: string
  /** Extra context shown when skill level is beginner — explains the OSINT "why" behind the feature. */
  beginnerNote?: string
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
    body: 'Every operation starts with a case. Create an investigation to organize your target, evidence, entity graph, timeline, and notes. Set one as active to use it as your working context across the whole app.',
    beginnerNote:
      "OSINT stands for Open Source Intelligence — gathering information from publicly available sources. An 'investigation' is how professionals organize everything they collect about a person, organization, or topic. Think of it like a case file: your target info, evidence, and notes all stay in one place."
  },
  {
    path: '/evidence',
    title: 'Evidence Board',
    body: 'Drop screenshots, images, and files here. GhostWire extracts EXIF metadata, computes SHA-256 hashes, and links everything to your case. Filter, sort, and preview directly in the board.',
    beginnerNote:
      'A screenshot without metadata is just a picture. GhostWire preserves EXIF data (when and where a photo was taken, what device captured it) and computes a SHA-256 hash — a unique fingerprint proving the file has not been altered. This chain of custody is what makes your findings credible.'
  },
  {
    path: '/graph',
    title: 'Graph Workspace',
    body: 'The link chart maps connections between entities — people, emails, phones, usernames, and domains. Drag nodes, add relationships, and export an interactive chart in your HTML reports.',
    beginnerNote:
      'Real investigations reveal networks, not just isolated facts. Link charts help you spot who knows who, which email addresses are shared across accounts, and how different identities might be connected. Start simple — add your target as a node, then connect everything you find.'
  },
  {
    path: '/timeline',
    title: 'Case Timeline',
    body: 'Build a chronological picture of your investigation. Log key events, tag evidence, and see your whole case sequence at a glance to spot patterns and gaps.',
    beginnerNote:
      "Timing matters. When did an account go quiet? When did a domain registration change? A timeline helps you spot behavioural patterns and answer the 'when' question — which often leads you to the 'who'."
  },
  {
    path: '/sock-puppets',
    title: 'Sock Puppets',
    body: 'Create and manage OSINT personas — each with a full fake identity, generated credentials, and an isolated browser session. Pin a persona to the side dock for quick reference while you browse.',
    beginnerNote:
      "A sock puppet is a fake online identity used to research a subject without revealing who you are. This is standard practice in professional OSINT — you don't want the subject to know they're being investigated, and you don't want your research linked back to your real identity."
  },
  {
    path: '/browser',
    title: 'Browser',
    body: 'Browse the web anonymously through any sock puppet. Each persona runs in its own isolated session with a spoofed fingerprint so sites cannot link your activity back to a real identity.',
    beginnerNote:
      'Every website visit leaks information: your IP address, browser fingerprint, and cookies. GhostWire gives each persona a completely clean slate — no cross-contamination between personas and no connection to your real browser history. This is called compartmentalization.'
  },
  {
    path: '/mailbox',
    title: 'Mailbox',
    body: "Give your personas a real inbox. Set up a catch-all email domain and receive messages directly through the Mailbox tab — the persona's webmail opens right inside GhostWire.",
    beginnerNote:
      'Most platforms require an email to sign up. A catch-all domain (where anything@yourfakedomain.com routes to one inbox) lets you create unique addresses for each persona on the fly without managing separate accounts. This is a common setup among OSINT practitioners.'
  },
  {
    path: '/intel',
    title: 'Research Tools',
    body: "The Research section packs in email & phone lookups, domain and IP intelligence, account finders, Reddit archiving, proximity analysis, and more — everything you'd normally tab between is right here in the sidebar.",
    beginnerNote:
      "These are the tools investigators use daily: email lookups find which accounts are registered to an address, account finders check if a username exists across platforms, domain tools reveal who owns a website. Together they let you build a full picture of a target from just one starting data point."
  },
  {
    path: '/vpn',
    title: 'VPN',
    body: 'Import WireGuard configs to route your traffic through a VPN. Keep your real IP hidden during research — especially important when browsing through sock puppet sessions.',
    beginnerNote:
      "Your IP address reveals your approximate location and internet provider. If a subject checks their account login history, your visit shows up. A VPN routes your traffic through another server, masking your real IP. Protecting your identity during research is called operational security — OPSEC."
  },
  {
    path: '/settings',
    title: "You're All Set",
    body: 'Configure your vault path, API keys, appearance, and backups from the Settings page. You can restart this tutorial any time by clicking "Restart tutorial" in the Appearance section.',
    beginnerNote:
      'Good first steps: set a vault path so GhostWire has a dedicated folder for your data, and add API keys for research services you plan to use — many have generous free tiers. You can always come back to configure these as your needs grow.'
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
  const [skillLevel, setSkillLevel] = useState<SkillLevel | undefined>(settings.osintSkillLevel)

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

  const pickSkill = (level: SkillLevel): void => {
    setSkillLevel(level)
    update({ osintSkillLevel: level })
  }

  const finish = (): void => {
    update({ tutorialCompleted: true })
    onClose()
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const showBeginnerNote = skillLevel === 'beginner' && !!current.beginnerNote

  return (
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
        <p className="text-sm text-slate-300 leading-relaxed">{current.body}</p>

        {/* Beginner context box */}
        {showBeginnerNote && (
          <div className="mt-3 p-3 rounded-lg bg-ink-800 border border-ink-700">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">OSINT context</div>
            <p className="text-xs text-slate-400 leading-relaxed">{current.beginnerNote}</p>
          </div>
        )}

        {/* Skill level picker — shown on step 0 so the user can set/change it */}
        {step === 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">What&apos;s your OSINT experience level?</p>
            <div className="grid grid-cols-3 gap-2">
              {SKILL_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => pickSkill(lvl.id)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    skillLevel === lvl.id
                      ? 'border-brand bg-brand/10 text-brand-glow'
                      : 'border-ink-600 bg-ink-800 text-slate-400 hover:border-ink-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-medium mb-0.5">{lvl.label}</div>
                  <div className="text-[10px] leading-snug opacity-75">{lvl.detail}</div>
                </button>
              ))}
            </div>
            {skillLevel === 'beginner' && (
              <p className="text-[11px] text-slate-500 mt-2">
                Extra OSINT context will appear on each step to help you get up to speed.
              </p>
            )}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-4 mb-4">
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

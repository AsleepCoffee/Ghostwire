import { useState } from 'react'
import { Twitter, Loader2, Search, Copy, Check, ExternalLink, Heart, Repeat2, MessageCircle, Eye, Image, Workflow } from 'lucide-react'
import { api, type XPostTweet } from '../lib/api'
import { useOpenInBrowser } from '../lib/browserBus'
import { useSettings } from '../lib/settings'
import { addToInvestigation } from '../lib/investigation'

function when(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  } catch {
    return iso
  }
}

function extractId(raw: string): string {
  const mc = raw.match(/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i)
  if (mc) return mc[1]
  if (/^\d+$/.test(raw.trim())) return raw.trim()
  return ''
}

function TweetCard({ tweet, nested }: { tweet: XPostTweet; nested?: boolean }): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const [copied, setCopied] = useState('')

  const copy = (val: string): void => {
    api.clipboard.writeText(val)
    setCopied(val)
    setTimeout(() => setCopied(''), 1200)
  }

  return (
    <div className={`card p-4 text-sm ${nested ? 'border-ink-600 bg-ink-900/40 ml-4' : ''}`}>
      {nested && (
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Quoted tweet</div>
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
            <button
              className="font-semibold text-slate-200 hover:underline"
              onClick={() => openInBrowser([tweet.authorUrl])}
            >
              {tweet.authorName || tweet.author}
            </button>
            <span className="font-mono text-slate-500 text-[12px]">@{tweet.author}</span>
            {tweet.authorId && (
              <span className="text-[11px] text-slate-600 font-mono">id:{tweet.authorId}</span>
            )}
            <span className="ml-auto text-[11px] text-slate-500">{when(tweet.created)}</span>
          </div>

          <div className="text-slate-200 whitespace-pre-wrap leading-relaxed mb-3">{tweet.text}</div>

          {tweet.mediaUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tweet.mediaUrls.map((u, i) => (
                <button key={i} className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([u])}>
                  <Image size={12} /> media {i + 1}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500 mb-3">
            <span className="flex items-center gap-1"><Heart size={12} /> {tweet.likes.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Repeat2 size={12} /> {tweet.retweets.toLocaleString()}</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} /> {tweet.replies.toLocaleString()}</span>
            {tweet.views != null && (
              <span className="flex items-center gap-1"><Eye size={12} /> {tweet.views.toLocaleString()}</span>
            )}
            {tweet.lang && <span className="font-mono">{tweet.lang}</span>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([tweet.permalinkUrl])}>
              <ExternalLink size={12} /> Open on X
            </button>
            <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://fxtwitter.com/${tweet.author}/status/${tweet.id}`])}>
              <ExternalLink size={12} /> FxTwitter
            </button>
            <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://xcancel.com/${tweet.author}/status/${tweet.id}`])}>
              <ExternalLink size={12} /> XCancel
            </button>
            <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://web.archive.org/web/*/${tweet.permalinkUrl}`])}>
              <ExternalLink size={12} /> Wayback
            </button>
            <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => copy(tweet.author)}>
              {copied === tweet.author ? <Check size={12} className="text-ok" /> : <Copy size={12} />} @handle
            </button>
            <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => copy(tweet.id)}>
              {copied === tweet.id ? <Check size={12} className="text-ok" /> : <Copy size={12} />} tweet id
            </button>
            <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => copy(tweet.text)}>
              {copied === tweet.text ? <Check size={12} className="text-ok" /> : <Copy size={12} />} text
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function XPost(): JSX.Element {
  const { settings } = useSettings()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tweet, setTweet] = useState<XPostTweet | null>(null)
  const [toast, setToast] = useState('')

  const flash = (m: string): void => {
    setToast(m)
    setTimeout(() => setToast(''), 3000)
  }

  const run = async (): Promise<void> => {
    if (!input.trim()) return
    setError('')
    setTweet(null)
    setLoading(true)
    try {
      const r = await api.intel.xpost(input.trim())
      if (!r.ok || !r.tweet) {
        setError(r.error || 'Lookup failed.')
        return
      }
      setTweet(r.tweet)
    } finally {
      setLoading(false)
    }
  }

  const addToCase = async (): Promise<void> => {
    if (!tweet) return
    const r = await addToInvestigation({
      projectId: settings.activeProjectId ?? null,
      entities: [{ type: 'username', label: tweet.author }]
    })
    flash(
      settings.activeProjectId
        ? `Added @${tweet.author} to the investigation (${r.nodes} node${r.nodes === 1 ? '' : 's'})`
        : `Added @${tweet.author} to a chart — set an active investigation to file it`
    )
  }

  const tweetId = extractId(input)

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Twitter size={20} className="text-brand-glow" /> X post lookup
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Look up any X / Twitter post by URL or tweet ID without being logged in — uses the{' '}
          <span className="font-mono">fxtwitter</span> public API. Useful for archiving posts before they disappear
          or when X blocks access without an account.
        </p>
      </div>

      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-2">
        <input
          className="input flex-1"
          placeholder="Post URL or tweet ID — e.g. https://x.com/user/status/1234567890"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <button className="btn-primary" onClick={run} disabled={!input.trim() || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Look up
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        {error && <div className="card p-3 text-sm text-warn max-w-2xl">{error}</div>}

        {tweet && (
          <div className="max-w-2xl space-y-4">
            {/* Identity card */}
            <div className="card p-4 border-brand/30 bg-brand/5">
              <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Author</div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg font-mono font-semibold text-brand-glow">@{tweet.author}</span>
                <span className="text-slate-400">{tweet.authorName}</span>
                {tweet.authorId && (
                  <span className="text-[11px] text-slate-500 font-mono">id {tweet.authorId}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <button
                  className="btn-primary text-[11px]"
                  onClick={addToCase}
                >
                  <Workflow size={12} /> Add to investigation
                </button>
              </div>
            </div>

            <TweetCard tweet={tweet} />

            {tweet.quotedTweet && <TweetCard tweet={tweet.quotedTweet} nested />}
          </div>
        )}

        {!tweet && !error && !loading && (
          <div className="card p-4 text-sm text-slate-400 max-w-2xl space-y-2">
            <div className="font-medium text-slate-300">No login required</div>
            <p>
              Paste any X / Twitter post URL (or just the numeric tweet ID). The fxtwitter API fetches the
              full post content including media metadata, quote tweets, and engagement counts — all without
              an X account or API key.
            </p>
            <p>
              <span className="text-slate-300">Tip:</span> Right-click any x.com link in the in-app browser
              and choose <span className="font-mono">View without login</span> to open alternative viewers
              or archive pages directly.
            </p>
            {tweetId && (
              <p className="text-slate-300">
                Detected tweet ID: <span className="font-mono">{tweetId}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="absolute bottom-5 right-5 z-40 card px-4 py-2.5 text-sm text-slate-200 border-accent/40 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

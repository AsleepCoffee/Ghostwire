import { useMemo, useState } from 'react'
import { MessageSquare, Loader2, Search, Copy, Check, ExternalLink, User, FileText } from 'lucide-react'
import { api, type RedditResult, type RedditItem } from '../lib/api'
import { useOpenInBrowser } from '../lib/browserBus'

type Mode = 'thread' | 'user'

function when(sec: number): string {
  if (!sec) return ''
  return new Date(sec * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

export function Reddit(): JSX.Element {
  const openInBrowser = useOpenInBrowser()
  const [mode, setMode] = useState<Mode>('thread')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [res, setRes] = useState<RedditResult | null>(null)
  const [copied, setCopied] = useState('')

  const run = async (): Promise<void> => {
    if (!input.trim()) return
    setError('')
    setRes(null)
    setLoading(true)
    try {
      const r = await api.intel.reddit(input.trim(), mode)
      if (!r.ok) {
        setError(r.error || 'Lookup failed.')
        return
      }
      setRes(r)
    } finally {
      setLoading(false)
    }
  }

  const copy = (val: string): void => {
    api.clipboard.writeText(val)
    setCopied(val)
    setTimeout(() => setCopied(''), 1200)
  }

  const placeholder = useMemo(
    () =>
      mode === 'thread'
        ? 'Reddit post URL or id, e.g. https://reddit.com/r/Military/comments/99iekm/…'
        : 'Username or profile URL, e.g. m4v3r1ck- or reddit.com/user/m4v3r1ck-',
    [mode]
  )

  // The headline answer: who authored this (even if the live post says [deleted]).
  const headlineAuthor =
    res?.mode === 'thread' ? res.submission?.author : res?.mode === 'user' ? res.username : undefined
  const headlineId = res?.mode === 'thread' ? res.submission?.authorFullname : res?.authorFullname
  const known = headlineAuthor && headlineAuthor !== '[deleted]' && headlineAuthor !== '[unknown]'

  const AuthorChip = ({ a }: { a: RedditItem }): JSX.Element => {
    const live = a.author !== '[deleted]' && a.author !== '[unknown]'
    return (
      <button
        className={`font-mono ${live ? 'text-brand-glow hover:underline' : 'text-slate-500'}`}
        onClick={() => live && openInBrowser([`https://www.reddit.com/user/${a.author}`])}
        title={live ? 'Open profile' : 'Author not recovered'}
      >
        u/{a.author}
      </button>
    )
  }

  const ItemCard = ({ a }: { a: RedditItem }): JSX.Element => (
    <div className="card p-2.5 text-sm">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        {a.kind === 'submission' ? <FileText size={12} /> : <MessageSquare size={12} />}
        <span className="uppercase tracking-widest">{a.kind}</span>
        <span>· r/{a.subreddit}</span>
        {typeof a.score === 'number' && <span>· {a.score} pts</span>}
        <span className="ml-auto">{when(a.created)}</span>
      </div>
      {a.title && <div className="text-slate-200 font-medium mt-1">{a.title}</div>}
      {a.body && <div className="text-slate-400 mt-1 whitespace-pre-wrap line-clamp-4">{a.body}</div>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
        <span className="text-[11px] text-slate-500">by <AuthorChip a={a} /></span>
        <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([a.permalink])}>
          <ExternalLink size={12} /> Open
        </button>
        {a.author !== '[deleted]' && a.author !== '[unknown]' && (
          <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => copy(a.author)}>
            {copied === a.author ? <Check size={12} className="text-ok" /> : <Copy size={12} />} author
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-ink-700">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <MessageSquare size={20} className="text-brand-glow" /> Reddit archive
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Recover the author of a deleted post/comment, or a user's history, from the PullPush &amp; Arctic Shift mirrors.
          These keep the <b>original author and text captured before deletion</b>, so <span className="font-mono">[deleted]</span> content can still be attributed. No key needed.
        </p>
      </div>

      <div className="px-6 py-3 border-b border-ink-700 flex items-center gap-2">
        <div className="flex rounded-lg border border-ink-600 overflow-hidden">
          <button className={`px-3 py-1.5 text-sm flex items-center gap-1 ${mode === 'thread' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setMode('thread')}>
            <FileText size={13} /> Post / thread
          </button>
          <button className={`px-3 py-1.5 text-sm flex items-center gap-1 ${mode === 'user' ? 'bg-brand/15 text-brand-glow' : 'text-slate-400 hover:bg-ink-800'}`} onClick={() => setMode('user')}>
            <User size={13} /> Username
          </button>
        </div>
        <input className="input flex-1" placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} />
        <button className="btn-primary" onClick={run} disabled={!input.trim() || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Look up
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        {error && <div className="card p-3 text-sm text-warn max-w-2xl">{error}</div>}

        {res && (
          <div className="max-w-2xl space-y-4">
            {/* Headline: the recovered identity */}
            {known && (
              <div className="card p-4 border-brand/30 bg-brand/5">
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                  {res.mode === 'thread' ? 'Recovered author of this post' : 'Username'}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="text-lg font-mono font-semibold text-brand-glow hover:underline"
                    onClick={() => openInBrowser([`https://www.reddit.com/user/${headlineAuthor}`])}
                  >
                    u/{headlineAuthor}
                  </button>
                  <button className="btn-ghost border border-ink-600 text-xs" onClick={() => copy(headlineAuthor!)}>
                    {copied === headlineAuthor ? <Check size={13} className="text-ok" /> : <Copy size={13} />} Copy
                  </button>
                  {headlineId && <span className="text-[11px] text-slate-500 font-mono">acct {headlineId}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://www.reddit.com/user/${headlineAuthor}`])}>
                    <ExternalLink size={12} /> Profile
                  </button>
                  <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://www.reveddit.com/y/${headlineAuthor}`])}>
                    <ExternalLink size={12} /> Reveddit (removed)
                  </button>
                  <button className="btn-ghost border border-ink-600 text-[11px]" onClick={() => openInBrowser([`https://camas.unddit.com/#%7B%22author%22:%22${encodeURIComponent(headlineAuthor!)}%22,%22subreddit%22:%22%22,%22searchFor%22:1%7D`])}>
                    <ExternalLink size={12} /> Camas search
                  </button>
                </div>
              </div>
            )}

            {/* Thread submission detail */}
            {res.mode === 'thread' && res.submission && <ItemCard a={res.submission} />}

            {/* Items list (comments for a thread, activity for a user) */}
            {res.items && res.items.length > 0 && (
              <>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">
                  {res.mode === 'thread' ? `${res.items.length} recovered comments` : `${res.items.length} recent items`}
                  {res.source ? ` · via ${res.source}` : ''}
                </div>
                {res.items.map((a) => (
                  <ItemCard key={`${a.kind}_${a.id}`} a={a} />
                ))}
              </>
            )}
          </div>
        )}

        {!res && !error && !loading && (
          <div className="card p-4 text-sm text-slate-400 max-w-2xl">
            <div className="font-medium text-slate-300 mb-1">How to find a deleted account</div>
            Paste the post URL (Post / thread mode). The archives kept the original <span className="font-mono">author</span>{' '}
            field from before deletion, so you get the real username even though Reddit now shows{' '}
            <span className="font-mono">[deleted]</span>. Thread lookups also recover the usernames of deleted{' '}
            <i>comments</i>. Then switch to Username mode to pull that account's history.
          </div>
        )}
      </div>
    </div>
  )
}

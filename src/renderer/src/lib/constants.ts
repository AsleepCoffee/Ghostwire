import type { EntityType, ProjectType } from './api'

export const PROJECT_TYPES: Record<ProjectType, { label: string; icon: string; color: string }> = {
  person: { label: 'Person', icon: 'UserSearch', color: '#60a5fa' },
  company: { label: 'Company', icon: 'Building2', color: '#fb923c' },
  other: { label: 'Other', icon: 'FolderSearch', color: '#a78bfa' }
}

export const ENTITY_TYPES: Record<
  EntityType,
  { label: string; color: string; ring: string; icon: string }
> = {
  person: { label: 'Person', color: '#60a5fa', ring: 'rgba(96,165,250,0.4)', icon: 'User' },
  username: { label: 'Username', color: '#a78bfa', ring: 'rgba(167,139,250,0.4)', icon: 'AtSign' },
  email: { label: 'Email', color: '#f472b6', ring: 'rgba(244,114,182,0.4)', icon: 'Mail' },
  phone: { label: 'Phone', color: '#34d399', ring: 'rgba(52,211,153,0.4)', icon: 'Phone' },
  domain: { label: 'Domain', color: '#22d3ee', ring: 'rgba(34,211,238,0.4)', icon: 'Globe' },
  ip: { label: 'IP Address', color: '#fbbf24', ring: 'rgba(251,191,36,0.4)', icon: 'Network' },
  organization: { label: 'Organization', color: '#fb923c', ring: 'rgba(251,146,60,0.4)', icon: 'Building2' },
  location: { label: 'Location', color: '#4ade80', ring: 'rgba(74,222,128,0.4)', icon: 'MapPin' },
  social: { label: 'Social Account', color: '#818cf8', ring: 'rgba(129,140,248,0.4)', icon: 'Share2' },
  image: { label: 'Image', color: '#e879f9', ring: 'rgba(232,121,249,0.4)', icon: 'Image' },
  document: { label: 'Document', color: '#94a3b8', ring: 'rgba(148,163,184,0.4)', icon: 'FileText' },
  wallet: { label: 'Crypto Wallet', color: '#facc15', ring: 'rgba(250,204,21,0.4)', icon: 'Wallet' },
  custom: { label: 'Custom', color: '#cbd5e1', ring: 'rgba(203,213,225,0.4)', icon: 'Box' }
}

/** Distinct identity colors for sock puppet avatars (the "fingerprint" chips). */
export const PERSONA_COLORS = [
  '#f43f5e',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#8b5cf6'
]

export function personaColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PERSONA_COLORS[h % PERSONA_COLORS.length]
}

// ---------- Sock puppet identity generator ----------
const FIRST_M = ['James', 'Liam', 'Noah', 'Ethan', 'Lucas', 'Mason', 'Logan', 'Owen', 'Caleb', 'Ryan', 'Daniel', 'Marcus', 'Victor', 'Adrian', 'Felix']
const FIRST_F = ['Emma', 'Olivia', 'Ava', 'Sophia', 'Mia', 'Isla', 'Chloe', 'Grace', 'Nora', 'Lily', 'Hannah', 'Clara', 'Maya', 'Elena', 'Iris']
const LAST = ['Carter', 'Bennett', 'Hayes', 'Morgan', 'Reed', 'Fisher', 'Walsh', 'Brooks', 'Coleman', 'Foster', 'Hughes', 'Porter', 'Sawyer', 'Vaughn', 'Quinn']
const CITIES = ['Austin, TX', 'Portland, OR', 'Manchester, UK', 'Toronto, ON', 'Denver, CO', 'Dublin, IE', 'Brisbane, AU', 'Lyon, FR', 'Seattle, WA', 'Glasgow, UK']
const JOBS = ['Freelance designer', 'Marketing coordinator', 'Software tester', 'Photographer', 'Barista', 'Content writer', 'Student', 'Sales associate', 'Data entry clerk', 'Customer support']
const INTERESTS = ['hiking', 'indie music', 'photography', 'gaming', 'cooking', 'cycling', 'true crime podcasts', 'thrifting', 'coffee', 'travel', 'sketching', 'plants']
const MAIL = ['proton.me', 'gmail.com', 'outlook.com', 'tutanota.com']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export interface GeneratedIdentity {
  name: string
  handle: string
  gender: string
  birthdate: string
  location: string
  occupation: string
  email: string
  backstory: string
}

export function generatePassword(len = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const nums = '23456789'
  const syms = '!@#$%&*?'
  const all = upper + lower + nums + syms
  const arr = new Uint32Array(len)
  crypto.getRandomValues(arr)
  // Guarantee one of each class, then fill the rest.
  const out = [
    upper[arr[0] % upper.length],
    lower[arr[1] % lower.length],
    nums[arr[2] % nums.length],
    syms[arr[3] % syms.length]
  ]
  for (let i = 4; i < len; i++) out.push(all[arr[i] % all.length])
  // Shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = arr[i] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join('')
}

/** Login pages for common platforms, used by the "Open & login" action. */
export const PLATFORM_LOGIN: Record<string, string> = {
  email: 'https://mail.proton.me/login',
  proton: 'https://mail.proton.me/login',
  protonmail: 'https://mail.proton.me/login',
  gmail: 'https://accounts.google.com/signin',
  google: 'https://accounts.google.com/signin',
  outlook: 'https://login.live.com/',
  facebook: 'https://www.facebook.com/login',
  instagram: 'https://www.instagram.com/accounts/login/',
  'x / twitter': 'https://twitter.com/i/flow/login',
  twitter: 'https://twitter.com/i/flow/login',
  x: 'https://twitter.com/i/flow/login',
  reddit: 'https://www.reddit.com/login/',
  linkedin: 'https://www.linkedin.com/login',
  tiktok: 'https://www.tiktok.com/login',
  discord: 'https://discord.com/login',
  telegram: 'https://web.telegram.org/',
  youtube: 'https://accounts.google.com/signin',
  github: 'https://github.com/login',
  pinterest: 'https://www.pinterest.com/login/',
  snapchat: 'https://accounts.snapchat.com/accounts/login',
  quora: 'https://www.quora.com/'
}

export function loginUrlFor(platform: string, fallbackUrl?: string): string {
  const key = platform.trim().toLowerCase()
  return PLATFORM_LOGIN[key] || fallbackUrl || `https://www.google.com/search?q=${encodeURIComponent(platform + ' login')}`
}

/** Build a starter set of accounts (with generated passwords) for a new persona. */
export function buildStarterAccounts(handle: string, email: string): import('./api').PersonaAccount[] {
  const platforms = ['Email', 'Facebook', 'Instagram', 'Reddit', 'X / Twitter']
  return platforms.map((platform) => ({
    platform,
    username: platform === 'Email' ? email : handle,
    password: generatePassword(),
    url: loginUrlFor(platform),
    notes: ''
  }))
}

export function generateIdentity(): GeneratedIdentity {
  const female = Math.random() > 0.5
  const first = female ? pick(FIRST_F) : pick(FIRST_M)
  const last = pick(LAST)
  const year = 1985 + Math.floor(Math.random() * 22)
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
  const num = Math.floor(Math.random() * 900 + 100)
  const handle = `${first.toLowerCase()}.${last.toLowerCase()}${num}`
  const location = pick(CITIES)
  const job = pick(JOBS)
  const i1 = pick(INTERESTS)
  let i2 = pick(INTERESTS)
  while (i2 === i1) i2 = pick(INTERESTS)
  return {
    name: `${first} ${last}`,
    handle,
    gender: female ? 'Female' : 'Male',
    birthdate: `${year}-${month}-${day}`,
    location,
    occupation: job,
    email: `${handle}@${pick(MAIL)}`,
    backstory: `${first} is a ${job.toLowerCase()} based in ${location}. Into ${i1} and ${i2}. Keeps a low-key online presence and mostly lurks. Use this persona for ${pick(['social media recon', 'forum access', 'marketplace browsing', 'general account creation'])}.`
  }
}

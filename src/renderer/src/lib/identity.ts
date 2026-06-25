import type { Persona } from './api'

export const DOB_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Whole years between a YYYY-MM-DD birthdate and today ('' if unparseable). */
export function ageFrom(bd?: string): string {
  if (!bd) return ''
  const d = new Date(bd)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a >= 0 && a < 130 ? String(a) : ''
}

export interface IdField {
  label: string
  value: string
}

/** The persona's identity fields as copyable label/value pairs (empties dropped).
 *  Includes split day / month-name / year for sign-up date dropdowns. */
export function identityFields(p: Partial<Persona>): IdField[] {
  const parts = (p.name ?? '').trim().split(/\s+/).filter(Boolean)
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts.slice(1).join(' ') : ''
  const [y, m, dd] = (p.birthdate ?? '').split('-')
  return [
    { label: 'Full name', value: p.name ?? '' },
    { label: 'First name', value: first },
    { label: 'Last name', value: last },
    { label: 'Username', value: p.handle ?? '' },
    { label: 'Email', value: p.email ?? '' },
    { label: 'Phone', value: p.phone ?? '' },
    { label: 'Gender', value: p.gender ?? '' },
    { label: 'Birthdate', value: p.birthdate ?? '' },
    { label: 'DOB day', value: dd ? String(Number(dd)) : '' },
    { label: 'DOB month', value: m ? DOB_MONTHS[Number(m) - 1] : '' },
    { label: 'DOB year', value: y ?? '' },
    { label: 'Age', value: ageFrom(p.birthdate) },
    { label: 'Location', value: p.location ?? '' },
    { label: 'Nationality', value: p.nationality ?? '' },
    { label: 'Occupation', value: p.occupation ?? '' }
  ].filter((f) => f.value)
}

/** A plain-text block of all identity fields, for "Copy all". */
export function identityText(p: Partial<Persona>): string {
  return identityFields(p)
    .map((f) => `${f.label}: ${f.value}`)
    .join('\n')
}

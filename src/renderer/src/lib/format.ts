const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Day Month Year — e.g. "24 Jun 2026". Accepts a timestamp, ISO string, or Date. */
export function fmtDate(input: number | string | Date): string {
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Day Month Year with 24h time — e.g. "24 Jun 2026, 14:32". */
export function fmtDateTime(input: number | string | Date): string {
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${fmtDate(d)}, ${hh}:${mm}`
}

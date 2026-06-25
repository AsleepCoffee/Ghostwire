/** IANA time zones for pickers (falls back to a short list on older runtimes). */
export const TIMEZONES: string[] = (() => {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    if (fn) return fn('timeZone')
  } catch {
    /* fall through */
  }
  return [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Africa/Cairo',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney'
  ]
})()

/** Time (HH:MM:SS, 24h) in a given IANA zone; '' if the zone is invalid. */
export function timeInZone(d: Date, tz?: string): string {
  try {
    return new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      ...(tz ? { timeZone: tz } : {})
    }).format(d)
  } catch {
    return ''
  }
}

/** Short weekday + day/month in a given zone, e.g. "Wed, 25 Jun". */
export function dateInZone(d: Date, tz?: string): string {
  try {
    return new Intl.DateTimeFormat([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(tz ? { timeZone: tz } : {})
    }).format(d)
  } catch {
    return ''
  }
}

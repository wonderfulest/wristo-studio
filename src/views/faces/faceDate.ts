/** API timestamps without an offset use the backend's UTC convention. */
export function formatFaceDate(value: string | null | undefined, locale: string, timeZone?: string): string {
  if (!value?.trim()) return ''
  const normalized = value.trim().replace(' ', 'T')
  const utcValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(normalized)
    ? `${normalized}Z`
    : normalized
  const date = new Date(utcValue)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone })
}

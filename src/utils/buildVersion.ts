/** Compare stable numeric build versions; unknown formats must not suggest a rebuild. */
export function isOlderBuildVersion(current?: string | null, latest?: string | null): boolean {
  const parse = (value?: string | null) => {
    const normalized = value?.trim().replace(/^v/, '')
    return normalized && /^\d+\.\d+\.\d+$/.test(normalized) ? normalized.split('.').map(Number) : null
  }
  const a = parse(current), b = parse(latest)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return false
}

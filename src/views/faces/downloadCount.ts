export function formatDownloadCount(count: number, showExact: boolean): string {
  if (showExact) return count.toLocaleString()
  if (count < 1) return '0'

  const magnitude = 10 ** Math.floor(Math.log10(count))
  if (magnitude >= 1_000_000_000) return `${magnitude / 1_000_000_000}B+`
  if (magnitude >= 1_000_000) return `${magnitude / 1_000_000}M+`
  if (magnitude >= 1_000) return `${magnitude / 1_000}K+`
  return `${magnitude}+`
}

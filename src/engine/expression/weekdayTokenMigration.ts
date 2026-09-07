// Migrate persisted data at load/save boundaries, not in the expression parser.
function migrateSource(source: string): string {
  return source.replace(/"(?:\\.|[^"\\])*"|\(dt5\)/g, (part) =>
    part === '(dt5)' ? '(tm5)' : part,
  )
}

export function migrateWeekdayTokens<T>(input: T): T {
  if (Array.isArray(input)) return input.map(migrateWeekdayTokens) as T
  if (!input || typeof input !== 'object') return input
  const record = input as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    const isExpressionSource = key === 'source' && 'ast' in record
    if (typeof value === 'string' && (isExpressionSource || key === 'textTemplate' || key === 'dateTemplate')) {
      result[key] = migrateSource(value)
    } else {
      result[key] = migrateWeekdayTokens(value)
    }
  }
  if (record.type === 'token' && record.tokenId === 'date.dayOfWeek') {
    result.tokenId = 'time.dayOfWeek'
    result.code = 'tm5'
  }
  return result as T
}

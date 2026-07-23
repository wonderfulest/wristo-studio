type TagFilterFields = {
  tagGroup?: unknown
  status?: unknown
}

export interface StyleTagSelectionResult {
  ids: number[]
  exceeded: boolean
}

export const filterEnabledStyleTags = <T extends TagFilterFields>(
  items: readonly T[] | null | undefined,
): T[] => items?.filter(item => item.tagGroup === 'style' && item.status === 1) ?? []

const uniqueNumericIds = (values: readonly unknown[]): number[] => {
  const ids: number[] = []
  const seen = new Set<number>()

  for (const value of values) {
    if (typeof value !== 'number' || !Number.isFinite(value) || seen.has(value)) {
      continue
    }
    seen.add(value)
    ids.push(value)
  }

  return ids
}

export const limitStyleTagSelection = (
  previous: readonly unknown[],
  next: readonly unknown[],
  limit = 5,
): StyleTagSelectionResult => {
  const cappedLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 5
  const nextIds = uniqueNumericIds(next)

  if (nextIds.length <= cappedLimit) {
    return { ids: nextIds, exceeded: false }
  }

  return {
    ids: uniqueNumericIds(previous).slice(0, cappedLimit),
    exceeded: true,
  }
}

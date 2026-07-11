import type { ShortcutDraft } from './shortcutPlacementManager'

export type CreatedShortcutProperty = {
  container: Record<string, unknown>
  key: string
  value: unknown
  created: boolean
}

export function ensureShortcutProperty(
  container: Record<string, unknown>,
  key: string,
  create: () => unknown,
): CreatedShortcutProperty {
  if (container[key] != null) {
    return { container, key, value: container[key], created: false }
  }
  const value = create()
  container[key] = value
  return { container, key, value, created: true }
}

export function ensureIndexedShortcutProperty(
  container: Record<string, unknown>,
  prefix: string,
  create: (key: string, index: number) => unknown,
): CreatedShortcutProperty {
  let maxIndex = 0
  const pattern = new RegExp(`^${prefix}_(\\d+)$`)
  Object.keys(container).forEach((key) => {
    const match = key.match(pattern)
    if (match) maxIndex = Math.max(maxIndex, Number(match[1]) || 0)
  })
  const index = maxIndex + 1
  const key = `${prefix}_${index}`
  return ensureShortcutProperty(container, key, () => create(key, index))
}

export function rollbackCreatedShortcutProperty(record: CreatedShortcutProperty): void {
  if (record.created && record.container[record.key] === record.value) {
    delete record.container[record.key]
  }
}

export function offsetShortcutDrafts(
  drafts: ShortcutDraft[],
  dx: number,
  dy: number,
): ShortcutDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    config: {
      ...draft.config,
      left: Number(draft.config.left) + dx,
      top: Number(draft.config.top) + dy,
    },
  }))
}

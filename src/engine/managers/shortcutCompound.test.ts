import { describe, expect, it } from 'vitest'
import { createSerialTaskQueue } from './shortcutAddTransaction'
import {
  ensureIndexedShortcutProperty,
  ensureShortcutProperty,
  offsetShortcutDrafts,
  rollbackCreatedShortcutProperty,
} from './shortcutCompound'

describe('compound shortcut preparation', () => {
  it('creates its property only after the compound task enters the queue', async () => {
    const enqueue = createSerialTaskQueue()
    const properties: Record<string, unknown> = {}
    let release!: () => void
    const first = enqueue(() => new Promise<void>((resolve) => { release = resolve }))
    const second = enqueue(() => ensureIndexedShortcutProperty(properties, 'data', (key) => ({ key })))

    await Promise.resolve()
    expect(properties).toEqual({})
    release()
    await first
    await second
    expect(properties).toEqual({ data_1: { key: 'data_1' } })
  })

  it('rolls back only a property created by the failed compound task', () => {
    const properties: Record<string, unknown> = { goal_1: { existing: true } }
    const existing = ensureShortcutProperty(properties, 'goal_1', () => ({ replacement: true }))
    const created = ensureIndexedShortcutProperty(properties, 'goal', (key) => ({ key }))

    rollbackCreatedShortcutProperty(created)
    rollbackCreatedShortcutProperty(existing)

    expect(properties).toEqual({ goal_1: { existing: true } })
  })

  it('keeps all three member offsets when the block is moved as a whole', () => {
    const drafts = offsetShortcutDrafts([
      { key: 'goal-bar', elementType: 'goalBar', config: { left: 227, top: 260 } },
      { key: 'goal-bar-icon', elementType: 'icon', config: { left: 177, top: 240 } },
      { key: 'goal-bar-value', elementType: 'data', config: { left: 277, top: 240 } },
    ], 30, -15)

    expect(drafts.map((draft) => [draft.config.left, draft.config.top])).toEqual([
      [257, 245],
      [207, 225],
      [307, 225],
    ])
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createSerialTaskQueue } from './shortcutAddTransaction'
import {
  createDynamicPropertyTracker,
  enqueueCompoundShortcut,
  runCompoundTransaction,
} from './compoundShortcutOrchestrator'
import { buildGoalBarDrafts } from './shortcutCompoundDrafts'

describe('compound shortcut production orchestrator', () => {
  it('does not prepare or allocate a property until its queued task starts', async () => {
    const queue = createSerialTaskQueue()
    let release!: () => void
    const first = queue(() => new Promise<void>((resolve) => { release = resolve }))
    const properties: string[] = []
    const prepare = vi.fn(() => {
      properties.push('data_1')
      return ['icon', 'data', 'unit']
    })
    const queued = enqueueCompoundShortcut((task) => queue(task), async () => (await prepare()).length)

    await Promise.resolve()
    expect(prepare).not.toHaveBeenCalled()
    expect(properties).toEqual([])
    release()
    await first
    await expect(queued).resolves.toBe(3)
    expect(properties).toEqual(['data_1'])
  })

  it('rolls back members and only the newly created property when a member fails', async () => {
    const canvas = ['existing']
    const elementMap = ['existing']
    const layers = ['existing']
    const save = vi.fn()
    const success = vi.fn()
    const error = vi.fn()

    const propertyContainer: Record<string, unknown> = {
      existing: { stable: true },
      created: { task: true },
      replaced: { replacement: true },
    }
    const originalCreated = propertyContainer.created
    const tracker = createDynamicPropertyTracker()
    tracker.track(propertyContainer, 'created', originalCreated)
    tracker.track(propertyContainer, 'existing', propertyContainer.existing, false)
    tracker.track(propertyContainer, 'replaced', { old: true })

    const result = await runCompoundTransaction({
      members: ['icon', 'data', 'unit'],
      createMember: async (member) => {
        if (member === 'data') throw new Error('member failed')
        canvas.push(member)
        elementMap.push(member)
        layers.push(member)
        return member
      },
      refine: vi.fn(), sync: vi.fn(), render: vi.fn(), save,
      propertyTracker: tracker,
      rollback: async () => {
        canvas.splice(1)
        elementMap.splice(1)
        layers.splice(1)
      },
      onSuccess: success,
      onError: error,
    })

    expect(result).toBeNull()
    expect(canvas).toEqual(['existing'])
    expect(elementMap).toEqual(['existing'])
    expect(layers).toEqual(['existing'])
    expect(propertyContainer).toEqual({ existing: { stable: true }, replaced: { replacement: true } })
    expect(save).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('keeps relative positions and commits and reports success once', async () => {
    const save = vi.fn(() => true)
    const success = vi.fn()
    const error = vi.fn()
    const drafts = buildGoalBarDrafts((category, elementType, overrides, key) => ({ key, elementType, config: { category, ...overrides } }), {
      propertyKey: 'goal_1', left: 227, top: 260, width: 100,
    })
    const result = await runCompoundTransaction({
      members: drafts,
      createMember: async (member) => member,
      refine: vi.fn(), sync: vi.fn(), render: vi.fn(), save,
      rollback: vi.fn(),
      onSuccess: success,
      onError: error,
    })

    expect(result?.map((member) => [member.config.left, member.config.top])).toEqual([
      [undefined, undefined], [177, 240], [277, 240],
    ])
    expect(result?.map(({ key, elementType }) => [key, elementType])).toEqual([
      ['goal-bar', 'goalBar'], ['goal-bar-icon', 'icon'], ['goal-bar-value', 'data'],
    ])
    expect(save).toHaveBeenCalledTimes(1)
    expect(success).toHaveBeenCalledTimes(1)
    expect(error).not.toHaveBeenCalled()
  })

  it('treats a rejected history save as one rollback and one error', async () => {
    const rollback = vi.fn()
    const error = vi.fn()
    const success = vi.fn()
    const result = await runCompoundTransaction({
      members: ['one', 'two', 'three'],
      createMember: async (member) => member,
      refine: vi.fn(), sync: vi.fn(), render: vi.fn(), save: vi.fn(() => false),
      rollback, onSuccess: success, onError: error,
    })
    expect(result).toBeNull()
    expect(rollback).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
    expect(success).not.toHaveBeenCalled()
  })

  it('rolls back exactly once when a later member reports a stale document', async () => {
    const rollback = vi.fn()
    const error = vi.fn()
    const result = await runCompoundTransaction({
      members: ['one', 'two', 'three'],
      createMember: async (member) => {
        if (member === 'three') throw new Error('Shortcut transaction is stale')
        return member
      },
      refine: vi.fn(), sync: vi.fn(), render: vi.fn(), save: vi.fn(() => true),
      rollback, onSuccess: vi.fn(), onError: error,
    })
    expect(result).toBeNull()
    expect(rollback).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
  })
})

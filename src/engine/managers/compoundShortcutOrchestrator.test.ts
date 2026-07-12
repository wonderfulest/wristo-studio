import { describe, expect, it, vi } from 'vitest'
import { createSerialTaskQueue } from './shortcutAddTransaction'
import {
  createDynamicPropertyTracker,
  enqueueCompoundShortcut,
  runCompoundTransaction,
} from './compoundShortcutOrchestrator'
import { buildDataFieldDrafts, buildGoalArcDrafts, buildGoalBarDrafts } from './shortcutCompoundDrafts'

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
      rollback: async () => {
        canvas.splice(1)
        elementMap.splice(1)
        layers.splice(1)
        tracker.rollback()
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

    expect(result?.map((member) => [
      member.config.left,
      member.config.top,
      member.config.originX,
    ])).toEqual([
      [227, 260, undefined],
      [177, 260, 'center'],
      [277, 260, 'left'],
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

  it.each(['member', 'refine', 'sync', 'render', 'save'] as const)(
    'uses one failure owner when %s fails, including cleanup errors',
    async (stage) => {
      const snapshotRollback = vi.fn()
      const propertyCleanup = vi.fn(() => { throw new Error('cleanup failed') })
      const rollback = vi.fn(async () => {
        snapshotRollback()
        propertyCleanup()
      })
      const error = vi.fn()
      const fail = () => { throw new Error(`${stage} failed`) }
      const result = await runCompoundTransaction({
        members: ['one'],
        createMember: stage === 'member' ? fail : async (member) => member,
        refine: stage === 'refine' ? fail : vi.fn(),
        sync: stage === 'sync' ? fail : vi.fn(),
        render: stage === 'render' ? fail : vi.fn(),
        save: stage === 'save' ? vi.fn(() => false) : vi.fn(() => true),
        rollback,
        onSuccess: vi.fn(),
        onError: error,
      })
      expect(result).toBeNull()
      expect(rollback).toHaveBeenCalledTimes(1)
      expect(snapshotRollback).toHaveBeenCalledTimes(1)
      expect(propertyCleanup).toHaveBeenCalledTimes(1)
      expect(error).toHaveBeenCalledTimes(1)
    },
  )

  it('builds Data Field with and without unit and preserves schema roles', () => {
    const factory = (_category: string, elementType: string, overrides: Record<string, any>, key: string) => ({ key, elementType, config: overrides })
    const base = { propertyKey: 'data_1', metricSymbol: ':DATA_TYPE_STEPS', left: 227, top: 227, fontSize: 36 }
    expect(buildDataFieldDrafts(factory, { ...base, unit: 'steps' }).map((draft) => draft.key)).toEqual(['data-icon', 'data-value', 'data-unit'])
    expect(buildDataFieldDrafts(factory, { ...base, unit: '' }).map((draft) => draft.key)).toEqual(['data-icon', 'data-value'])
  })

  it('builds Goal Arc keys, types, and centered relative coordinates', () => {
    const factory = (_category: string, elementType: string, overrides: Record<string, any>, key: string) => ({ key, elementType, config: overrides })
    const drafts = buildGoalArcDrafts(factory, { propertyKey: 'goal_1', left: 227, top: 260 })
    expect(drafts.map(({ key, elementType }) => [key, elementType])).toEqual([
      ['goal-arc', 'goalArc'], ['goal-arc-icon', 'icon'], ['goal-arc-value', 'data'],
    ])
    expect([drafts[0].config.left, drafts[0].config.top]).toEqual([227, 260])
    expect(drafts.slice(1).map((draft) => [draft.config.left, draft.config.top])).toEqual([[227, 244], [227, 276]])
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createSerialTaskQueue } from './shortcutAddTransaction'
import {
  enqueueCompoundShortcut,
  executeCompoundMembers,
} from './compoundShortcutOrchestrator'

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
    const properties = ['existing-property', 'new-property']
    const save = vi.fn()
    const success = vi.fn()
    const error = vi.fn()

    const result = await executeCompoundMembers({
      members: ['icon', 'data', 'unit'],
      createMember: async (member) => {
        if (member === 'data') throw new Error('member failed')
        canvas.push(member)
        elementMap.push(member)
        layers.push(member)
        return member
      },
      commit: save,
      rollback: async () => {
        canvas.splice(1)
        elementMap.splice(1)
        layers.splice(1)
        properties.splice(properties.indexOf('new-property'), 1)
      },
      onSuccess: success,
      onError: error,
    })

    expect(result).toBeNull()
    expect(canvas).toEqual(['existing'])
    expect(elementMap).toEqual(['existing'])
    expect(layers).toEqual(['existing'])
    expect(properties).toEqual(['existing-property'])
    expect(save).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('keeps relative positions and commits and reports success once', async () => {
    const save = vi.fn(() => true)
    const success = vi.fn()
    const error = vi.fn()
    const members = [
      { left: 227, top: 260 },
      { left: 177, top: 240 },
      { left: 277, top: 240 },
    ]

    const result = await executeCompoundMembers({
      members,
      createMember: async (member) => ({ left: member.left + 30, top: member.top - 15 }),
      commit: save,
      rollback: vi.fn(),
      onSuccess: success,
      onError: error,
    })

    expect(result?.map((member) => [member.left, member.top])).toEqual([
      [257, 245], [207, 225], [307, 225],
    ])
    expect(save).toHaveBeenCalledTimes(1)
    expect(success).toHaveBeenCalledTimes(1)
    expect(error).not.toHaveBeenCalled()
  })
})

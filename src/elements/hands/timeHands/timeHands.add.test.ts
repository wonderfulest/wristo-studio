import { describe, expect, it, vi } from 'vitest'
import { addTimeHandsGroup } from './timeHands.add'

const configs = ['hourHand', 'minuteHand', 'secondHand', 'centerCap'].map((eleType, index) => ({
  id: `hand-${index}`,
  eleType,
}))

describe('addTimeHandsGroup', () => {
  it('adds the group in order inside one atomic mutation and saves history once', async () => {
    const calls: string[] = []
    const saveHistory = vi.fn()

    await addTimeHandsGroup(configs as any, {
      runAtomic: async (task) => {
        calls.push('transaction:start')
        const result = await task()
        calls.push('transaction:end')
        return result
      },
      addElement: async (config) => {
        calls.push(String(config.eleType))
        return { id: config.id }
      },
      saveHistory,
    })

    expect(calls).toEqual([
      'transaction:start',
      'hourHand',
      'minuteHand',
      'secondHand',
      'centerCap',
      'transaction:end',
    ])
    expect(saveHistory).toHaveBeenCalledTimes(1)
  })

  it('does not save a partial group when an element cannot be created', async () => {
    const saveHistory = vi.fn()

    await expect(addTimeHandsGroup(configs as any, {
      runAtomic: task => task(),
      addElement: async (config) => config.eleType === 'minuteHand' ? undefined : { id: config.id },
      saveHistory,
    })).rejects.toThrow('minuteHand')

    expect(saveHistory).not.toHaveBeenCalled()
  })
})

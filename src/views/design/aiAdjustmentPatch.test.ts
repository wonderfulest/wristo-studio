import { describe, it, expect } from 'vitest'
import { adjustmentElements, validateAdjustment, applyAdjustment } from './aiAdjustmentPatch'

const configs = [{ id: 'time', eleType: 'time', fontSize: 60, left: 227, top: 150, fill: '#FFFFFF', fillProperty: 'main', dataProperty: 'steps', src: 'secret-asset' }, { id: 'date', eleType: 'text', fontSize: 30, left: 227, top: 220 }]
const result = { summary: 'Larger time', changes: [{ id: 'time', patch: { fontSize: 72 } }] }
describe('AI adjustment patch boundary', () => {
  it('sends editable scalars without assets or bound colors', () => {
    const elements = adjustmentElements(configs)
    expect(elements[0].fields).toEqual({ fontSize: 60, left: 227, top: 150 })
    expect(JSON.stringify(elements)).not.toContain('secret-asset')
  })
  it('rejects out-of-scope IDs, bindings and invalid values', () => {
    const elements = adjustmentElements(configs)
    expect(() => validateAdjustment(elements, ['date'], result)).toThrow()
    for (const patch of [{ dataProperty: 'heartRate' }, { fontSize: -3 }, { fill: '#000000' }]) {
      expect(() => validateAdjustment(elements, [], { ...result, changes: [{ id: 'time', patch }] } as any)).toThrow()
    }
  })
  it('applies all patches in one atomic history step, rejects stale state before mutation', async () => {
    const events: string[] = []
    const deps = { currentFingerprint: async () => 'current', atomic: async (task: () => Promise<void>) => { events.push('atomic'); await task() }, update: async (id: string) => { events.push(id) }, save: () => { events.push('save') } }
    await expect(applyAdjustment('old', adjustmentElements(configs), [], result, deps)).rejects.toThrow('changed')
    expect(events).toEqual([])
    await applyAdjustment('current', adjustmentElements(configs), [], result, deps)
    expect(events).toEqual(['atomic', 'time', 'save'])
  })
  it('does not save a partial failed mutation', async () => {
    const events: string[] = []
    await expect(applyAdjustment('same', adjustmentElements(configs), [], result, {
      currentFingerprint: async () => 'same', atomic: async task => { try { await task() } catch (e) { events.push('rollback'); throw e } },
      update: async () => { throw Error('renderer failed') }, save: () => { events.push('save') },
    })).rejects.toThrow('renderer failed')
    expect(events).toEqual(['rollback'])
  })
})

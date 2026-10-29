import { describe, it, expect } from 'vitest'
import { validateAdjustment, applyAdjustment } from './aiAdjustmentPatch'
import { weatherVisibility, additionConfig } from './aiAdjustmentOperations'
import { resolveElementVisibility } from '@/engine/expression/visibility'
const elements = [{ id: 'time', eleType: 'time', fields: { fontSize: 60 }, context: {} }]
const sun = { id: 'sun', eleType: 'circle' as const, fields: { left: 300, top: 200, radius: 25, fill: '#FFCC00' }, weather: 'clear' as const }
const result = { summary: 'Weather scenery', changes: [], additions: [sun] }
describe('AI scene operations', () => {
  it('accepts additions without requiring a scalar patch', () => {
    expect(() => validateAdjustment(elements, [], result, 454)).not.toThrow()
    expect(additionConfig(sun, 'font')).toMatchObject({ id: 'sun', eleType: 'circle', originX: 'center', radius: 25, visibility: { mode: 'expression' } })
  })
  it('rejects additions in selected scope, collisions, assets and invalid shapes', () => {
    expect(() => validateAdjustment(elements, ['time'], result)).toThrow()
    for (const addition of [{ ...sun, id: 'time' }, { ...sun, fields: { ...sun.fields, src: 'https://host/image' } }, { ...sun, weather: 'arbitrary' }, { ...sun, fields: { ...sun.fields, radius: -5 } }]) {
      expect(() => validateAdjustment(elements, [], { ...result, additions: [addition] } as any)).toThrow()
    }
  })
  it('rejects overlapping removal and modification and stale operations before applying', async () => {
    expect(() => validateAdjustment(elements, [], { summary: 'Bad', changes: [{ id: 'time', patch: { fontSize: 72 } }], removals: ['time'] })).toThrow()
    const events: string[] = []
    const deps = { currentFingerprint: async () => 'new', atomic: async (f: () => Promise<void>) => { events.push('atomic'); await f() }, update: async () => {}, add: async () => { events.push('sun') }, remove: async () => {}, weather: async () => {}, save: () => { events.push('save') } }
    await expect(applyAdjustment('old', elements, [], result, deps)).rejects.toThrow('changed')
    expect(events).toEqual([])
    await applyAdjustment('new', elements, [], result, deps)
    expect(events).toEqual(['atomic', 'sun', 'save'])
  })
  it('supports removal and weather-only adjustments', () => {
    expect(() => validateAdjustment(elements, [], { summary: 'Remove', changes: [], removals: ['time'] })).not.toThrow()
    expect(() => validateAdjustment(elements, [], { summary: 'Weather', changes: [], weatherRules: [{ id: 'time', weather: 'rain' }] })).not.toThrow()
  })
  it('covers all normalized weather codes once and hides conditions on missing weather', () => {
    const presets = ['clear', 'cloudy', 'rain', 'snow', 'storm', 'fog', 'night'] as const
    const visible = (weather: typeof presets[number], code?: number | null) => resolveElementVisibility({ displayStates: { active: true, ambient: true }, previewMode: 'active', visibility: weatherVisibility(weather), tokenValues: code === undefined ? {} : { 'weather.current.conditionCode': code } })
    for (let code = 0; code <= 13; code++) expect(presets.filter(p => visible(p, code))).toHaveLength(1)
    for (const preset of presets) { expect(visible(preset)).toBe(false); expect(visible(preset, null)).toBe(false); expect(visible(preset, -1)).toBe(false) }
  })
})

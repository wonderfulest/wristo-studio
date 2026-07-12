import { describe, expect, it } from 'vitest'
import { subDialSchema } from './subDial.schema'
import { buildContentItemPatch, buildLayoutPresetPatch } from './subDial.panelModel'

const content = () => structuredClone(subDialSchema.defaultConfig.content)

describe('sub-dial content panel patches', () => {
  it('patches one item completely and lets new values win', () => {
    const current = content()
    const patch = buildContentItemPatch(current, 'value', { color: '#123456', x: 0.8 })
    expect(patch.content.value).toEqual({ ...current.value, color: '#123456', x: 0.8 })
    expect(patch.content.icon).toEqual(current.icon)
    expect(patch.content).not.toBe(current)
  })

  it('applies a preset without changing style fields', () => {
    const current = content()
    current.value.color = '#123456'
    current.value.prefix = '≈'
    const patch = buildLayoutPresetPatch(current, 'compact')
    expect(patch.content.value.color).toBe('#123456')
    expect(patch.content.value.prefix).toBe('≈')
    expect(patch.content.value.y).not.toBe(current.value.y)
  })
})

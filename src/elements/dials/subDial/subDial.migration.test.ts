import { describe, expect, it } from 'vitest'
import { subDialSchema } from './subDial.schema'
import { migrateSubDialConfig } from './subDial.migration'

describe('subDial migration', () => {
  it('migrates legacy progress and value presentation fields without retaining legacy keys', () => {
    const legacy = {
      goalProperty: 'steps',
      showValue: false,
      showUnit: true,
      unit: 'STEPS',
      decimals: 1,
      valueColor: '#00FF00',
      valueFontSize: 18
    }

    const migrated = migrateSubDialConfig(legacy)

    expect(migrated.progressProperty).toBe('steps')
    expect(migrated.content.value).toMatchObject({
      visible: false,
      decimals: 1,
      color: '#00FF00',
      fontSize: 18
    })
    expect(migrated.content.unit).toMatchObject({ visible: true, suffix: 'STEPS' })
    for (const key of ['goalProperty', 'showValue', 'showUnit', 'unit', 'decimals', 'valueColor', 'valueFontSize']) {
      expect(Object.prototype.hasOwnProperty.call(migrated, key)).toBe(false)
    }
    expect(legacy).toEqual({
      goalProperty: 'steps', showValue: false, showUnit: true, unit: 'STEPS', decimals: 1,
      valueColor: '#00FF00', valueFontSize: 18
    })
  })

  it('prefers partial new content and fills every nested default independently', () => {
    const input = {
      goalProperty: 'legacy',
      progressProperty: 'new',
      progressMode: 'custom' as const,
      showValue: false,
      valueColor: '#00FF00',
      content: { value: { visible: true, x: 0.25 }, unit: { suffix: 'KM' } }
    }

    const first = migrateSubDialConfig(input)
    first.content.value.y = 99
    first.pointer.width = 99
    const second = migrateSubDialConfig(input)

    expect(second.progressProperty).toBe('new')
    expect(second.progressMode).toBe('custom')
    expect(second.content.value).toMatchObject({ visible: true, x: 0.25, y: 0.2, color: '#00FF00' })
    expect(second.content.unit).toMatchObject({ visible: true, suffix: 'KM' })
    expect(second.content.value.y).toBe(subDialSchema.defaultConfig.content.value.y)
    expect(second.pointer.width).toBe(subDialSchema.defaultConfig.pointer.width)
  })
})

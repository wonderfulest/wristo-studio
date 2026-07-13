import { describe, expect, it } from 'vitest'
import { migrateSubDialConfig } from './subDial.migration'

describe('subDial migration', () => {
  it('keeps the new Dial Property contract', () => {
    const config = migrateSubDialConfig({ dialProperty: 'dial_goal_1', progressMode: 'goal' })
    expect(config).toMatchObject({ dialProperty: 'dial_goal_1', progressMode: 'goal' })
    expect(config).not.toHaveProperty('progressProperty')
    expect(config).not.toHaveProperty('goalProperty')
  })

  it('marks legacy auto and custom bindings for explicit user migration', () => {
    expect(migrateSubDialConfig({ progressProperty: 'steps', progressMode: 'auto' })).toMatchObject({
      dialProperty: '', progressMode: 'goal', needsDialMigration: true
    })
    expect(migrateSubDialConfig({ progressProperty: 'temperature', progressMode: 'custom' })).toMatchObject({
      dialProperty: '', progressMode: 'goal', needsDialMigration: true
    })
  })

  it('migrates presentation fields without retaining legacy keys', () => {
    const migrated = migrateSubDialConfig({
      goalProperty: 'steps', showValue: false, showUnit: true, unit: 'STEPS', decimals: 1,
      valueColor: '#00FF00', valueFontSize: 18
    })
    expect(migrated.content.value).toMatchObject({ visible: false, decimals: 1, color: '#00FF00', fontSize: 18 })
    expect(migrated.content.unit).toMatchObject({ visible: true, suffix: 'STEPS' })
    for (const key of ['goalProperty', 'progressProperty', 'showValue', 'showUnit', 'unit', 'decimals', 'valueColor', 'valueFontSize']) {
      expect(migrated).not.toHaveProperty(key)
    }
  })

  it('drops unknown fields', () => {
    expect(migrateSubDialConfig({ dialProperty: 'dial_range_1', unknownFutureField: 'leak' })).not.toHaveProperty('unknownFutureField')
  })
})

import { describe, expect, it } from 'vitest'
import type { DataUnitDefinition } from '@/types/dataCatalog'
import { resolveUnitLabel, resolveUnitVariant } from './unitResolver'

const distanceUnit: DataUnitDefinition = {
  unitKey: 'distance',
  name: 'Distance',
  defaultVariant: 'km',
  selectionPolicy: {
    type: 'deviceSetting',
    setting: 'distanceUnits',
    mapping: { metric: 'km', statute: 'mi' },
  },
  variants: {
    km: { aliases: ['km'], label: { eng: 'km', zhs: '公里' } },
    mi: { aliases: ['mi', 'mile'], label: { eng: 'mi', zhs: '英里' } },
  },
  isActive: 1,
  sortOrder: 1,
  description: null,
}

const temperatureUnit: DataUnitDefinition = {
  unitKey: 'temperature',
  name: 'Temperature',
  defaultVariant: 'celsius',
  selectionPolicy: {
    type: 'deviceSetting',
    setting: 'temperatureUnits',
    mapping: { metric: 'celsius', statute: 'fahrenheit' },
  },
  variants: {
    celsius: { aliases: ['c', '°c'], label: { eng: '°C', zhs: '摄氏度' } },
    fahrenheit: { aliases: ['f', '°f'], label: { eng: '°F', zhs: '华氏度' } },
  },
  isActive: 1,
  sortOrder: 2,
  description: null,
}

describe('unit resolver', () => {
  it('selects statute distance and localizes it in Chinese', () => {
    const variantKey = resolveUnitVariant(distanceUnit, {
      language: 'zhs', distanceUnits: 'statute', temperatureUnits: 'metric',
    })
    expect(variantKey).toBe('mi')
    expect(resolveUnitLabel(distanceUnit, variantKey, 'zhs')).toBe('英里')
  })

  it('returns the complete temperature unit for a standalone Unit element', () => {
    const variantKey = resolveUnitVariant(temperatureUnit, {
      language: 'eng', distanceUnits: 'metric', temperatureUnits: 'metric',
    })
    expect(resolveUnitLabel(temperatureUnit, variantKey, 'eng')).toBe('°C')
  })

  it('rejects an unknown provider alias without falling back', () => {
    const paceUnit: DataUnitDefinition = {
      ...distanceUnit,
      unitKey: 'pace',
      selectionPolicy: { type: 'provider', fallbackVariant: 'min_per_km' },
      defaultVariant: 'min_per_km',
      variants: {
        min_per_km: { aliases: ['min/km'], label: { eng: 'min/km', zhs: '分钟/公里' } },
      },
    }
    expect(() => resolveUnitVariant(paceUnit, {
      language: 'eng', distanceUnits: 'metric', temperatureUnits: 'metric',
    }, 'yards/hour')).toThrow('unitKey pace: unknown runtime unit alias "yards/hour"')
  })
})

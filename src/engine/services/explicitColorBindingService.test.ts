import { describe, expect, it } from 'vitest'
import {
  migrateLegacyColorBindings,
  normalizeBindingColor,
  validateExplicitColorBindings,
} from './explicitColorBindingService'
import type { PropertiesMap } from '@/types/properties'

const colorProperty = (value: string) => ({
  type: 'color' as const,
  title: 'Color',
  value,
})

describe('explicitColorBindingService', () => {
  it('normalizes supported color representations', () => {
    expect(normalizeBindingColor('#FFAA55')).toBe('#ffaa55')
    expect(normalizeBindingColor('0xffAA55')).toBe('#ffaa55')
    expect(normalizeBindingColor('transparent')).toBe('transparent')
  })

  it('migrates a unique legacy color match exactly once', () => {
    const properties: PropertiesMap = { color_1: colorProperty('0xffaa55') }
    const first = migrateLegacyColorBindings(
      [{ id: 'a', eleType: 'data', fill: '#FFAA55' } as any],
      properties,
    )

    expect(first.elements[0]).toMatchObject({ fill: '#FFAA55', fillProperty: 'color_1' })
    expect(first.migratedBindings).toEqual([{
      elementId: 'a',
      elementType: 'data',
      colorField: 'fill',
      propertyField: 'fillProperty',
      propertyKey: 'color_1',
    }])
    expect(first.ambiguousBindings).toEqual([])

    const second = migrateLegacyColorBindings(first.elements, properties)
    expect(second.migratedBindings).toEqual([])
  })

  it('does not guess when multiple color properties have the same value', () => {
    const result = migrateLegacyColorBindings(
      [{ id: 'a', eleType: 'data', fill: '#FFAA55' } as any],
      {
        color_1: colorProperty('0xffaa55'),
        color_2: colorProperty('#FFAA55'),
      },
    )

    expect(result.elements[0]).not.toHaveProperty('fillProperty')
    expect(result.ambiguousBindings[0]).toMatchObject({
      elementId: 'a',
      colorField: 'fill',
      candidateKeys: ['color_1', 'color_2'],
    })
  })

  it('preserves an existing explicit binding and validates invalid references', () => {
    const elements = [{
      id: 'a',
      eleType: 'data',
      fill: '#FFFFFF',
      fillProperty: 'missing',
    } as any]
    const migration = migrateLegacyColorBindings(elements, {
      color_1: colorProperty('#FFFFFF'),
    })
    expect((migration.elements[0] as any).fillProperty).toBe('missing')
    expect(migration.migratedBindings).toEqual([])

    expect(validateExplicitColorBindings(elements, {})).toEqual([{
      elementId: 'a',
      elementType: 'data',
      colorField: 'fill',
      propertyField: 'fillProperty',
      propertyKey: 'missing',
      reason: 'missing',
    }])
  })

  it('preserves an explicit null binding instead of migrating it again', () => {
    const migration = migrateLegacyColorBindings([{
      id: 'a',
      eleType: 'data',
      fill: '#FFAA55',
      fillProperty: null,
    } as any], {
      color_1: colorProperty('0xffaa55'),
    })

    expect((migration.elements[0] as any).fillProperty).toBeNull()
    expect(migration.migratedBindings).toEqual([])
  })
})

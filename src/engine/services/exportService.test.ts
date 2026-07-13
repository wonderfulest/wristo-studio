import { describe, expect, it } from 'vitest'
import { validateDataGoalBindings } from './propertyBindingValidation'
import type { FabricElement } from '@/types/element'
import type { PropertiesMap } from '@/types/properties'

describe('validateDataGoalBindings', () => {
  it('rejects a data element bound to a missing data property', () => {
    const objects = [
      {
        eleType: 'data',
        dataProperty: 'data_6',
      } as FabricElement,
    ]
    const properties: PropertiesMap = {}

    const translate = (key: string, params?: Record<string, string | number>) => {
      if (key === 'export.validation.missingDataProperty') {
        return `Data element references missing data property (${params?.key})`
      }
      return key
    }

    expect(validateDataGoalBindings(objects, properties, translate)).toEqual([
      'Data element references missing data property (data_6)',
    ])
  })
})

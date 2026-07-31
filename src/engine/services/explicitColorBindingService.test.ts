import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  normalizeBindingColor,
  validateExplicitColorBindings,
} from './explicitColorBindingService'

describe('explicitColorBindingService', () => {
  it('normalizes supported color representations', () => {
    expect(normalizeBindingColor('#FFAA55')).toBe('#ffaa55')
    expect(normalizeBindingColor('0xffAA55')).toBe('#ffaa55')
    expect(normalizeBindingColor('transparent')).toBe('transparent')
  })

  it('validates an invalid explicit binding without repairing it by color value', () => {
    const elements = [{
      id: 'a',
      eleType: 'data',
      fill: '#FFFFFF',
      fillProperty: 'missing',
    } as any]

    expect(validateExplicitColorBindings(elements, {})).toEqual([{
      elementId: 'a',
      elementType: 'data',
      colorField: 'fill',
      propertyField: 'fillProperty',
      propertyKey: 'missing',
      reason: 'missing',
    }])
  })

  it('does not infer color-property bindings while loading a design', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/views/Design.vue'), 'utf8')
    expect(source).not.toContain('migrateLegacyColorBindings')
    expect(source).not.toContain('colorBindingsMigrated')
    expect(source).not.toContain('colorBindingsAmbiguous')
  })
})

import { describe, expect, it } from 'vitest'
import { COMPLICATION_OPTIONS, complicationPreview, resolveComplicationType, validateComplicationProperty } from './complication.catalog'
import type { PropertyItem } from '@/types/properties'
const property = (): PropertyItem => ({
  type: 'complication',
  title: 'Left Complication',
  value: 18,
  options: [
    { value: 18, label: 'Heart Rate' },
    { value: 2, label: 'Steps' }
  ]
})
describe('Complication sources and dynamic properties', () => {
  it('uses all 42 canonical Garmin IDs without confusing training status and predictions', () => {
    expect(COMPLICATION_OPTIONS.map((option) => option.value)).toEqual(Array.from({ length: 42 }, (_, index) => index + 1))
    expect(COMPLICATION_OPTIONS.find((option) => option.value === 26)?.label).toBe('Training Status')
    expect(COMPLICATION_OPTIONS.find((option) => option.value === 42)?.minApi).toBe('6.0.2')
  })
  it('switches value, label and launch source together without changing saved fixed fallback', () => {
    const config = { complicationType: 1, complicationProperty: 'complication_1' }
    const properties = { complication_1: property() }
    expect(complicationPreview(config, properties)).toBe('72 bpm')
    properties.complication_1.value = 2
    expect(resolveComplicationType(config, properties)).toBe(2)
    expect(complicationPreview({ ...config, displayMode: 'label' }, properties)).toBe('Steps')
    expect(complicationPreview({ ...config, displayMode: 'shortcut' }, properties)).toBe('')
    expect(config.complicationType).toBe(1)
    expect(complicationPreview({ complicationType: 1 }, properties)).toBe('83%')
  })
  it('rejects duplicate options, unknown IDs, missing bindings and defaults outside the allowed list', () => {
    for (const values of [[18, 18], [0], [43], ['18'], [true], []]) {
      expect(() => validateComplicationProperty({ ...property(), options: values.map((value) => ({ value, label: 'Test' })) })).toThrow()
    }
    expect(() => validateComplicationProperty({ ...property(), value: 1 })).toThrow()
    expect(() => resolveComplicationType({ complicationProperty: 'missing' }, {})).toThrow()
  })
})

import { validateComplicationConfig } from './complication.catalog'
import { complicationHitTest, complicationIcon, complicationProgress, complicationTouchBounds, normalizeComplicationPresentation } from './complication.presentation'
import iconCatalog from './complication.icons.json'

describe('Complication independent presentation and interaction', () => {
  it('changes automatic icon with source, keeps custom icons and slot geometry fixed', () => {
    const config = { iconSource: 'auto' as const, displayWidth: 160, displayHeight: 64, touchMode: 'auto' as const }
    expect(complicationIcon(config, 18)).toBe('heart')
    expect(complicationIcon(config, 2)).toBe('steps')
    expect(complicationIcon({ ...config, iconSource: 'custom', customIcon: 'bike' }, 18)).toBe('bike')
    expect(complicationIcon({ ...config, iconSource: 'custom', customIcon: 'bike' }, 2)).toBe('bike')
    expect(complicationTouchBounds(config)).toMatchObject({ x: -88, y: -40, width: 176, height: 80 })
    for (const source of COMPLICATION_OPTIONS) expect(iconCatalog.icons).toHaveProperty(complicationIcon(config, source.value))
  })
  it('uses independent rectangular/circular bounds, padding and center offsets', () => {
    const config = { displayWidth: 160, displayHeight: 64, touchMode: 'custom' as const, touchWidth: 100, touchHeight: 80, touchOffsetX: 20, touchOffsetY: -10 }
    expect(complicationHitTest(config, -30, -50)).toBe(true)
    const circle = { ...config, touchShape: 'circle' as const }
    expect(complicationTouchBounds(circle)).toMatchObject({ x: -20, y: -50, width: 80, height: 80 })
    expect(complicationHitTest(circle, -20, -50)).toBe(false)
    expect(complicationHitTest(circle, 20, -50)).toBe(true)
    expect(complicationHitTest(circle, 20, -10)).toBe(true)
    expect(complicationHitTest(circle, 61, -10)).toBe(false)
  })
  it('preserves legacy independent regions and transparent area sizes', () => {
    expect(normalizeComplicationPresentation({ displayMode: 'shortcut', touchWidth: 120, touchHeight: 80 })).toMatchObject({ touchMode: 'custom', displayWidth: 120, displayHeight: 80 })
  })
  it('clamps progress and does not turn weather codes or missing ranges into completion', () => {
    expect(complicationProgress({}, 1)).toBe(0.83)
    expect(complicationProgress({ progressRange: 'custom', progressMin: 0, progressMax: 10000 }, 2)).toBe(0.9088)
    expect(complicationProgress({ progressRange: 'custom', progressMin: 0, progressMax: 100 }, 2)).toBe(1)
    expect(complicationProgress({}, 18)).toBeNull()
    expect(complicationProgress({ progressRange: 'custom' }, 8)).toBeNull()
    expect(complicationProgress({ progressRange: 'custom', progressMin: 100, progressMax: 100 }, 18)).toBeNull()
  })
  it('validates styles, finite geometry, ranges and safe colors before export', () => {
    for (const mode of ['shortcut', 'icon', 'value', 'iconValue', 'progress', 'label']) {
      expect(validateComplicationConfig({}, [{ eleType: 'complication', displayMode: mode }])).toEqual([])
    }
    for (const patch of [
      { displayWidth: NaN },
      { touchPadding: -1 },
      { touchShape: 'triangle' },
      { iconSource: 'bad' },
      { customIcon: 'missing' },
      { progressMax: 0 },
      { progressTrackColor: 'red' },
      { backgroundColor: '#fff' }
    ]) {
      expect(validateComplicationConfig({}, [{ eleType: 'complication', ...patch }]).length).toBe(1)
    }
  })
})

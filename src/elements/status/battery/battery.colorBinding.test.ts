import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeBattery, encodeBattery } from './battery.encoder'

const colorBindings = {
  bodyStrokeProperty: 'outlineColor',
  bodyFillProperty: 'surfaceColor',
  headFillProperty: 'accentColor',
  levelColorLowProperty: 'dangerColor',
  levelColorMediumProperty: 'warningColor',
  levelColorHighProperty: 'successColor',
}

describe('battery color property bindings', () => {
  it('round-trips every battery color binding through encode and decode', () => {
    const element = {
      id: 'battery-1',
      left: 10,
      top: 20,
      originX: 'center',
      originY: 'center',
      padding: 2,
      headGap: 1,
      levelColorLow: '#FF0000',
      levelColorMedium: '#FFFF00',
      levelColorHigh: '#00FF00',
      ...colorBindings,
      _body: {
        width: 40,
        height: 20,
        stroke: '#FFFFFF',
        fill: 'transparent',
        strokeWidth: 2,
        rx: 2,
        ry: 2,
      },
      _head: {
        width: 4,
        height: 10,
        fill: '#FFFFFF',
        rx: 1,
        ry: 1,
      },
      _level: {
        width: 18,
      },
    }

    const encoded = encodeBattery(element as any)
    expect(encoded).toMatchObject(colorBindings)
    expect(decodeBattery(encoded)).toMatchObject(colorBindings)
  })

  it('binds every battery color picker to its matching property field', () => {
    const source = readFileSync(new URL('./battery.panel.vue', import.meta.url), 'utf8')

    expect(source).toContain(':property-key="currentModel.bodyStrokeProperty"')
    expect(source).toContain(':property-key="currentModel.bodyFillProperty"')
    expect(source).toContain(':property-key="currentModel.headFillProperty"')
    expect(source).toContain(':property-key="currentModel[`${range.field}Property`]"')
    expect(source).toContain('@property-change="handleColorSelection')
  })
})

import { describe, expect, it } from 'vitest'
import source from './lineChart.panel.vue?raw'

describe('LineChart color binding panel', () => {
  it('binds line and point colors to independent color properties', () => {
    expect(source).toContain(':property-key="formModel.colorProperty"')
    expect(source).toContain(':property-key="formModel.pointColorProperty"')
    expect(source).toContain('colorProperty: $event.propertyKey')
    expect(source).toContain('pointColorProperty: $event.propertyKey')
  })
})

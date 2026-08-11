import { describe, expect, it } from 'vitest'
import appMenuShapeSource from '@/components/layout/app-menu/AppMenuShape.vue?raw'
import schemaMapSource from '@/elements/schemaMap.ts?raw'
import shapeTypesSource from '@/types/elements/shape.ts?raw'

describe('triangle integration contract', () => {
  it('adds a dedicated triangle entry instead of a polygon preset', () => {
    expect(appMenuShapeSource).toContain("onAddElement('shape', 'triangle'")
    expect(appMenuShapeSource).toContain("t('editor.triangle')")
    expect(schemaMapSource).toContain('triangle: buildConfigFromSchema(triangleSchema')
    expect(shapeTypesSource).toContain("eleType: 'triangle'")
  })
})

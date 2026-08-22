// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { elementConfigs } from '@/elements/schemaMap'

describe('Grid Lines schema registration', () => {
  it('exposes Grid Lines as an enabled shape with the agreed defaults', () => {
    expect(elementConfigs.shape.gridLines).toMatchObject({
      eleType: 'gridLines',
      label: 'Grid Lines',
      disabled: false,
      width: 200,
      height: 80,
      spacing: 20,
      lineWidth: 1,
      color: '#FFFFFF',
      colorProperty: null,
      rotation: 0,
    })
  })
})

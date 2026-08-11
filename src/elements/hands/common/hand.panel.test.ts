import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('hand settings panels', () => {
  it('uses one shared geometry editor for hour, minute, and second hands', () => {
    for (const type of ['hourHand', 'minuteHand', 'secondHand']) {
      const source = fs.readFileSync(
        path.join(root, `src/elements/hands/${type}/${type}.panel.vue`),
        'utf8',
      )
      expect(source).toContain('<HandGeometrySettings')
      expect(source).toContain("import HandGeometrySettings from '@/elements/hands/common/HandGeometrySettings.vue'")
    }
  })

  it('exposes geometry center, pivot offset, and scale controls', () => {
    const source = fs.readFileSync(
      path.join(root, 'src/elements/hands/common/HandGeometrySettings.vue'),
      'utf8',
    )
    for (const field of ['centerX', 'centerY', 'pivotOffsetX', 'pivotOffsetY', 'scalePercent']) {
      expect(source).toContain(`field: '${field}'`)
    }
    expect(source).toContain('<el-slider')
    expect(source).toContain('handScalePercentToSlider')
    expect(source).toContain('handScaleSliderToPercent')
  })
})

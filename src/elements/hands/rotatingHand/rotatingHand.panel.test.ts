import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(path.join(process.cwd(), 'src/elements/hands/rotatingHand/rotatingHand.panel.vue'), 'utf8')

describe('rotating hand settings panel', () => {
  it('uses Dial Property and the shared time-hand geometry workflow', () => {
    expect(source).toContain('<DialPropertyField')
    expect(source).toContain('<HandGeometrySettings')
    expect(source).toContain('asset-type="hour"')
  })

  it('exposes preview, angle, direction, and out-of-range controls', () => {
    expect(source).toContain('previewProgress')
    expect(source).toContain('startAngle')
    expect(source).toContain('endAngle')
    expect(source).toContain('counterClockwise')
    expect(source).toContain('outOfRangeBehavior')
  })

  it('clears the Dial Property when progress mode changes', () => {
    expect(source).toContain("patch({ progressMode: mode, dialProperty: '' })")
  })

  it('shows bearing and north angle controls for Direction mode', () => {
    expect(source).toContain("value: 'direction'")
    expect(source).toContain("model.progressMode === 'direction'")
    expect(source).toContain('previewBearing')
    expect(source).toContain('northAngle')
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./subDial.panel.vue', import.meta.url), 'utf8')

describe('subDial panel content controls', () => {
  it('uses the generic data selector and progressProperty', () => {
    expect(source).toContain('DataPropertyField')
    expect(source).toContain('model.progressProperty')
    expect(source).not.toContain('GoalPropertyField')
    expect(source).not.toContain('model.goalProperty')
  })
  it('exposes the six content items and layout editor actions', () => {
    for (const key of ['icon','label','value','unit','goalValue','percentage']) expect(source).toContain(key)
    expect(source).toContain('buildContentItemPatch')
    expect(source).toContain('resetSelectedPosition')
  })
})

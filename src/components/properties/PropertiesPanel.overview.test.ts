import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Properties panel overview', () => {
  it('hides property type summaries whose count is zero', () => {
    const panelSource = readFileSync(
      new URL('./PropertiesPanel.vue', import.meta.url),
      'utf8',
    )

    expect(panelSource).toContain('.filter((stat) => stat.count > 0)')
  })

})

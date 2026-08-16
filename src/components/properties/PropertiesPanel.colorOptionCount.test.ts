import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PropertiesPanel option count', () => {
  it('shows option counts for color, data, and goal properties on their outer cards', () => {
    const source = readFileSync(new URL('./PropertiesPanel.vue', import.meta.url), 'utf8')

    expect(source).toContain("if (prop.type === 'data') return prop.metricSymbols?.length || 0")
    expect(source).toContain("if (prop.type === 'color' || prop.type === 'goal') return prop.options?.length || 0")
    expect(source).toContain('v-if="getPropertyOptionCount(item.prop) !== null"')
    expect(source).toContain("t('property.propertyCount', { count: getPropertyOptionCount(item.prop) })")
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PropertiesPanel date settings contract', () => {
  const source = readFileSync(new URL('./PropertiesPanel.vue', import.meta.url), 'utf8')

  it('includes canvas date elements as derived property entries', () => {
    expect(source).toContain("const typeOrder = ['color', 'data', 'goal', 'chart', 'text', 'dial', 'date']")
    expect(source).toContain("snapshot.eleType === 'date'")
    expect(source).toContain('DateFormatter${index}')
    expect(source).toContain('const canvasDateIds = (canvasStore.canvas?.getObjects?.() || [])')
  })

  it('offers only date format options for derived date entries', () => {
    expect(source).toContain('DateFormatOptions.filter')
    expect(source).toContain('getAllowedDateFormatters(designStore.appLanguage)')
    expect(source).toContain('v-for="option in item.prop.options"')
    expect(source).toContain('resolveDateFormatterValues')
  })

  it('updates the matching date element when its format changes', () => {
    expect(source).toContain('updateDateFormatter(item.elementId, $event)')
    expect(source).toContain('elementManager.updateElementById(elementId, { formatter: Number(formatter) })')
    expect(source).toContain('elementManager.updateElementById(elementId, { formatter, formatterOptions })')
  })
})

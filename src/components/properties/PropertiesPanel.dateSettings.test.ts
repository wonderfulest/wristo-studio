import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PropertiesPanel shared date settings contract', () => {
  const source = readFileSync(new URL('./PropertiesPanel.vue', import.meta.url), 'utf8')

  it('lists date properties from the shared property store', () => {
    expect(source).toContain("const typeOrder = ['color', 'data', 'goal', 'chart', 'text', 'dial', 'date']")
    expect(source).toContain('Object.entries(propertiesStore.allProperties)')
    expect(source).not.toContain('DateFormatter${index}')
  })

  it('allows creating, editing, and binding a date property', () => {
    expect(source).toContain("type === 'date'")
    expect(source).toContain('datePropertyDialog.value?.show()')
    expect(source).toContain("type !== 'data' && type !== 'goal' && type !== 'date'")
  })

  it('updates the shared property value instead of one element', () => {
    expect(source).toContain('updateDatePropertyValue(item.key, $event)')
    expect(source).toContain('propertiesStore.setPropertyValue(key, Number(formatter))')
    expect(source).not.toContain('updateDateFormatter(item.elementId, $event)')
  })
})

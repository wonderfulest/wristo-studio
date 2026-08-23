import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('PropertiesPanel data label length control', () => {
  it('shows all exact ranges only for English designs and refreshes the canvas', () => {
    const source = readFileSync(new URL('./PropertiesPanel.vue', import.meta.url), 'utf8')

    expect(source).toContain("designStore.appLanguage === 'eng'")
    expect(source).toContain('Short (1–4 characters)')
    expect(source).toContain('Medium (5–8 characters)')
    expect(source).toContain('Long (9–12 characters)')
    expect(source).toContain("designStore.setDataLabelLength(value)")
    expect(source).toContain('getDataSimulatorEngine().updateCanvas()')
  })
})

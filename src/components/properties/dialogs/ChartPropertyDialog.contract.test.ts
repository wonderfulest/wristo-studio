import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./ChartPropertyDialog.vue', import.meta.url), 'utf8')

describe('ChartPropertyDialog display contract', () => {
  it('renders chart names through the localized settings label resolver', () => {
    expect(source).toContain('resolveDataOptionSettingsLabel')
    expect(source).toContain('optionDisplayLabel(option)')
    expect(source).not.toContain('option.name')
  })

  it('converts chart icon unicode to glyphs and uses the Wristo data icon font', () => {
    expect(source).toContain('resolveMetricIconGlyph')
    expect(source).toContain('iconGlyph(option)')
    expect(source).not.toContain('{{ option.icon }}')
    expect(source).toMatch(/\.metric-icon\s*\{[^}]*font-family:\s*var\(--studio-data-icon-font\)/s)
    expect(source).toMatch(/\.selected-option-icon\s*\{[^}]*font-family:\s*var\(--studio-data-icon-font\)/s)
  })
})

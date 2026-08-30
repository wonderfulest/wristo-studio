import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./GoalPropertyDialog.vue', import.meta.url), 'utf8')

describe('GoalPropertyDialog display contract', () => {
  it('renders goal names through the localized settings label resolver', () => {
    expect(source).toContain('resolveDataOptionSettingsLabel')
    expect(source).toContain('optionDisplayLabel(option)')
    expect(source).not.toContain('option.name')
  })

  it('renders goal glyphs with the Wristo data icon font', () => {
    expect(source).toMatch(/\.goal-icon\s*\{[^}]*font-family:\s*var\(--studio-data-icon-font\)/s)
    expect(source).toMatch(/\.selected-option-icon\s*\{[^}]*font-family:\s*var\(--studio-data-icon-font\)/s)
  })
})

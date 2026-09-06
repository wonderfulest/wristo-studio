import { describe, expect, it } from 'vitest'
import { validateTokenTemplate } from '@/engine/expression/textTemplateTokens'
import { textVariablePresets } from './textVariablePresets'

describe('text variable presets', () => {
  it('uses valid WFB token expressions instead of legacy brace templates', () => {
    expect(textVariablePresets.find((preset) => preset.key === 'text_today_activity')?.value)
      .toBe('"Activity " + (ai12) + " steps"')

    for (const preset of textVariablePresets) {
      expect(preset.value).not.toContain('{{')
      expect(preset.value).not.toContain('}}')
      expect(validateTokenTemplate(preset.value)).toEqual([])
    }
  })
})

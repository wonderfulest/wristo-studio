import { describe, expect, it } from 'vitest'
import { getDescriptionTemplate, setDescriptionTemplate } from './descriptionTemplateLanguage'

describe('independent language templates', () => {
  it('uses the exact language and payment method without English fallback', () => {
    const config = { descriptionTemplate: 'English', descriptionTemplates: { fr: { wpay: 'Français', free: 'Gratuit' } } }
    expect(getDescriptionTemplate(config, 'wpay', 'fr')).toBe('Français')
    expect(getDescriptionTemplate(config, 'free', 'fr')).toBe('Gratuit')
    expect(getDescriptionTemplate(config, 'garmin', 'fr')).toBe('')
    expect(getDescriptionTemplate(config, 'wpay', 'ja')).toBe('')
  })
  it('updates one template without changing other languages or payment methods', () => {
    const config = { descriptionTemplate: 'English', descriptionTemplateZh: '中文', descriptionTemplates: { fr: { free: 'Gratuit' } } }
    setDescriptionTemplate(config, 'wpay', 'fr', 'Payant')
    setDescriptionTemplate(config, 'garmin', 'zh', '佳明')
    expect(getDescriptionTemplate(config, 'wpay', 'fr')).toBe('Payant')
    expect(getDescriptionTemplate(config, 'free', 'fr')).toBe('Gratuit')
    expect(config.descriptionTemplate).toBe('English')
    expect(config.descriptionTemplateZh).toBe('中文')
    expect(getDescriptionTemplate(config, 'garmin', 'zh')).toBe('佳明')
  })
})

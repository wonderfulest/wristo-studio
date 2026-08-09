import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./EditorSettingsDialog.vue', import.meta.url), 'utf8')

describe('Editor settings non-Latin support switch', () => {
  it('binds a design-wide switch and refreshes localized previews', () => {
    expect(source).toContain("t('editorSettings.nonLatinLanguageSupport')")
    expect(source).toContain(':model-value="nonLatinLanguageSupport"')
    expect(source).toContain('@change="handleNonLatinLanguageSupportChange"')
    expect(source).toContain('designStore.setNonLatinLanguageSupport(nextEnabled)')
    expect(source).toContain('refreshMetricTextElementsForContentLanguage()')
    expect(source).toContain('refreshDateElementsForContentLanguage()')
  })
})

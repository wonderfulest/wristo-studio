import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

describe('design-language font picker wiring', () => {
  it('uses the design language by default and lets numeric content opt out', () => {
    const picker = read('./font-picker.vue')
    const timePanel = read('../../elements/time/time/time.panel.vue')
    const dataPanel = read('../../elements/data/data/data.panel.vue')
    const datePanel = read('../../elements/time/date/date.panel.vue')
    const importDialog = read('./FontImportDialog.vue')
    const exportService = read('../../engine/services/exportService.ts')
    expect(picker).toContain('useDesignStore')
    expect(picker).toContain('effectiveContentLanguage')
    expect(picker).toContain('allowAnyLanguage')
    expect(timePanel).toContain(':allow-any-language="true"')
    expect(dataPanel).toContain(':allow-any-language="true"')
    expect(datePanel).toContain("getAllowedDateFormatters(designStore.appLanguage)")
    expect(datePanel).toContain("designStore.appLanguage === 'zhs' ? option.zhsLabel : option.label")
    expect(importDialog).toContain('selectedFontLanguage.value = designStore.appLanguage')
    expect(exportService).toContain("config.localization?.appLanguage === 'zhs'")
  })
})

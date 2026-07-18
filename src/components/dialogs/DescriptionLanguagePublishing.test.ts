import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readDialog = (name: string) =>
  readFileSync(new URL(`./${name}.vue`, import.meta.url), 'utf8')

describe.each(['GoLiveDialog', 'SubmitDesignDialog'])('%s description language', (name) => {
  it('offers English and Chinese without changing the description on selection', () => {
    const source = readDialog(name)

    expect(source).toContain('v-model="descriptionLanguage"')
    expect(source).toContain('value="en"')
    expect(source).toContain('value="zh"')
    expect(source).not.toContain('@change="handleDescriptionLanguageChange"')
  })

  it('defaults to English and includes the selected language when refreshing', () => {
    const source = readDialog(name)

    expect(source).toContain("ref<DescriptionTemplateLanguage>('en')")
    expect(source).toContain("descriptionLanguage.value = 'en'")
    expect(source).toContain('buildGenerateDescriptionPayload(')
    expect(source).toContain('descriptionLanguage.value')
  })
})

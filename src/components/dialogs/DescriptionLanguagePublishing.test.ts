import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readDialog = (name: string) =>
  readFileSync(new URL(`./${name}.vue`, import.meta.url), 'utf8')

describe.each(['GoLiveDialog', 'SubmitDesignDialog'])('%s description language', (name) => {
  it('does not offer a manual template language selector', () => {
    const source = readDialog(name)

    expect(source).not.toContain('v-model="descriptionLanguage"')
    expect(source).not.toContain('goLive.descriptionLanguage')
  })

  it('derives the template language from the watchface config when refreshing', () => {
    const source = readDialog(name)

    expect(source).toContain('resolveDescriptionTemplateLanguage(')
    expect(source).toContain('buildGenerateDescriptionPayload(')
    expect(source).toContain('currentDesign.value?.configJson')
  })
})

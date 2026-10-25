import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readDialog = (name: string) =>
  readFileSync(new URL(`./${name}.vue`, import.meta.url), 'utf8')

describe.each(['PublishForm'])('%s description language', (name) => {
  it('does not offer a manual template language selector', () => {
    const source = readDialog(name)

    expect(source).not.toContain('v-model="descriptionLanguage"')
    expect(source).not.toContain('goLive.descriptionLanguage')
  })

  it('uses the selected description language when refreshing', () => {
    const source = readDialog(name)

    expect(source).toContain('const language = descriptionLanguage.value')
    expect(source).toContain('buildGenerateDescriptionPayload(')
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const dialogNames = ['Color', 'Text', 'Data', 'Goal', 'Chart', 'Dial']

describe('property dialog localization contract', () => {
  it.each(dialogNames)('%s property preserves a Simplified Chinese title', (name) => {
    const source = readFileSync(new URL(`./${name}PropertyDialog.vue`, import.meta.url), 'utf8')
    expect(source).toContain('LocalizedPropertyTitleField')
    expect(source).toContain('titleCn')
  })

  it.each(['Color', 'Goal', 'Chart', 'Dial'])('%s options preserve Simplified Chinese labels', (name) => {
    const source = readFileSync(new URL(`./${name}PropertyDialog.vue`, import.meta.url), 'utf8')
    expect(source).toContain('withSimplifiedChineseOptionLabels')
  })
})

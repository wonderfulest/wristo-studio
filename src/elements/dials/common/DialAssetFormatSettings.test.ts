import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const readSource = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')

describe('dial face asset format guidance', () => {
  it.each(['../tick12/tick12.panel.vue', '../tick60/tick60.panel.vue', '../romans/romans.panel.vue'])(
    'describes SVG and PNG support in %s',
    (relativePath) => {
      expect(readSource(relativePath)).toContain("t('elementSettings.svgPngTip')")
      expect(readSource(relativePath)).toContain("t('elementSettings.svgPngSquareTip')")
      expect(readSource(relativePath)).not.toContain("t('elementSettings.svgOnlyTip')")
      expect(readSource(relativePath)).not.toContain("t('elementSettings.svgSquareTip')")
    },
  )
})

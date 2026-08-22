import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./dynamicImage.panel.vue', import.meta.url), 'utf8')

describe('dynamic image panel group copying', () => {
  it('offers group copying only while adding and appends copied rules', () => {
    expect(source).toContain('v-if="editingIndex === null"')
    expect(source).toContain("t('dynamicImage.copyExistingGroup')")
    expect(source).toContain('<DynamicImageGroupCopyDialog')
    expect(source).toContain('@copy="handleCopyGroup"')
    expect(source).toContain('appendCopiedDynamicImageItems(items.value, sourceItems, nanoid)')
  })
})

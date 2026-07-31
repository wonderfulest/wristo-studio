import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const cardSource = readFileSync(new URL('./DesignCard.vue', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./MyDesigns.vue', import.meta.url), 'utf8')

describe('My Designs Store weight administration', () => {
  it('renders the editor only for administrators with an application', () => {
    expect(cardSource).toContain('v-if="isAdminUser" class="store-weight-editor"')
    expect(cardSource).toContain('<div v-if="design.product?.appId">')
  })

  it('uses independent per-application saving state', () => {
    expect(pageSource).toContain('storeWeightSavingAppIds.has(design.product?.appId ?? -1)')
    expect(pageSource).toContain('storeWeightSavingAppIds.value.add(appId)')
    expect(pageSource).toContain('storeWeightSavingAppIds.value.delete(appId)')
  })

  it('reconciles the server value and reports API failures', () => {
    expect(pageSource).toContain('design.product.storeWeight = response.data.storeWeight ?? storeWeight')
    expect(pageSource).toContain("messageStore.error(response.msg || t('common.saveFailed'))")
  })
})

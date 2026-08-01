import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const cardSource = readFileSync(new URL('./DesignCard.vue', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./MyDesigns.vue', import.meta.url), 'utf8')
const productsApiSource = readFileSync(new URL('../../api/wristo/products.ts', import.meta.url), 'utf8')
const adminUsersApiSource = readFileSync(new URL('../../api/wristo/adminUsers.ts', import.meta.url), 'utf8')
const i18nSource = readFileSync(new URL('../../i18n.ts', import.meta.url), 'utf8')

describe('My Designs product owner transfer', () => {
  it('exposes the transfer action only to administrators for published applications', () => {
    expect(cardSource).toContain('v-if="isAdminUser && appId"')
    expect(cardSource).toContain("(e: 'transfer-owner', design: Design): void")
    expect(cardSource).toContain("emit('transfer-owner', design)")
  })

  it('uses administrator APIs to find designers and transfer product ownership', () => {
    expect(productsApiSource).toContain('`/admin/products/transfer-owner/${appId}/${newUserId}`')
    expect(adminUsersApiSource).toContain("instance.get('/admin/users/search'")
    expect(adminUsersApiSource).toContain("instance.get('/admin/roles/list/all')")
    expect(adminUsersApiSource).toContain('keyword')
    expect(adminUsersApiSource).toContain('roleId')
  })

  it('owns the dialog lifecycle in the designs page and refreshes after success', () => {
    expect(pageSource).toContain('@transfer-owner="openTransferOwnerDialog"')
    expect(pageSource).toContain('const transferDialogVisible = ref(false)')
    expect(pageSource).toContain('const transferTargetUserId = ref<number | undefined>()')
    expect(pageSource).toContain('if (!isAdminUser.value || !appId)')
    expect(pageSource).toContain('if (!transferTargetUserId.value)')
    expect(pageSource).toContain('transferTargetUserId.value === design.user?.id')
    expect(pageSource).toContain('productsApi.transferOwner(appId, transferTargetUserId.value)')
    expect(pageSource).toContain('await fetchDesigns()')
  })

  it('provides English and Chinese transfer copy', () => {
    const keys = [
      'action',
      'title',
      'currentApp',
      'currentAuthor',
      'placeholder',
      'confirm',
      'targetRequired',
      'sameDesigner',
      'success',
      'unavailable',
      'failed',
    ]

    for (const key of keys) {
      expect(i18nSource.match(new RegExp(`'card\\.transferOwner\\.${key}'`, 'g'))).toHaveLength(2)
    }
  })
})

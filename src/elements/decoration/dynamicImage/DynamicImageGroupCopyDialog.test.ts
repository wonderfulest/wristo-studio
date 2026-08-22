import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./DynamicImageGroupCopyDialog.vue', import.meta.url), 'utf8')

describe('DynamicImageGroupCopyDialog', () => {
  it('loads only the current user projects with search and pagination', () => {
    expect(source).toContain("scope: 'mine'")
    expect(source).toContain('pageNum: projectPage.value')
    expect(source).toContain('name: projectSearch.value.trim() || undefined')
    expect(source).toContain('designApi.getDesignPage')
  })

  it('loads source design details and emits the selected complete group', () => {
    expect(source).toContain('designApi.getDesignByUid')
    expect(source).toContain('extractDynamicImageGroups(response.data.configJson)')
    expect(source).toContain("emit('copy', selectedGroup.value.items)")
  })
})

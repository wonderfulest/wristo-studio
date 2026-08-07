import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(new URL('./MyDesigns.vue', import.meta.url), 'utf8')
const designTypesSource = readFileSync(new URL('../../types/api/design.ts', import.meta.url), 'utf8')
const i18nSource = readFileSync(new URL('../../i18n.ts', import.meta.url), 'utf8')

describe('My Designs administrator designer filter', () => {
  it('renders the reusable remote designer selector only for administrators', () => {
    expect(pageSource).toContain('<DesignerSelect')
    expect(pageSource).toContain('v-if="isAdminUser"')
    expect(pageSource).toContain(':model-value="selectedCreatorUserId"')
    expect(pageSource).toContain(':placeholder="t(\'project.searchDesigner\')"')
    expect(pageSource).toContain('@update:model-value="handleCreatorChange"')
  })

  it('resets pagination and reloads when the selected designer changes', () => {
    expect(pageSource).toContain('const handleCreatorChange = (creatorUserId?: number) => {')
    expect(pageSource).toContain('currentPage.value = 1')
    expect(pageSource).toContain('fetchDesigns()')
  })

  it('sends an exact creator user ID only for administrators', () => {
    expect(designTypesSource).toContain('creatorUserId?: number')
    expect(pageSource).toContain('creatorUserId: isAdminUser.value ? selectedCreatorUserId.value : undefined')
  })

  it('persists the selected creator with the other design filters', () => {
    expect(pageSource).toContain('selectedCreatorUserId?: number')
    expect(pageSource).toContain('selectedCreatorUserId: normalizeCreatorUserId(parsed.selectedCreatorUserId)')
    expect(pageSource).toContain('selectedCreatorUserId: selectedCreatorUserId.value')
  })

  it('provides English and Chinese designer search copy', () => {
    expect(i18nSource.match(/'project\.searchDesigner'/g)).toHaveLength(2)
    expect(i18nSource).toContain("'project.searchDesigner': 'Search Designer'")
    expect(i18nSource).toContain("'project.searchDesigner': '搜索设计师'")
  })
})

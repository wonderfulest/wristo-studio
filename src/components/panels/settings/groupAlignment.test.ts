import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const groupSettingsSource = readFileSync(
  new URL('./GroupSettings.vue', import.meta.url),
  'utf8',
)
const bottomBarSource = readFileSync(
  new URL('../../dialogs/EditorSettingsDialog.vue', import.meta.url),
  'utf8',
)

describe('multi-selection alignment placement', () => {
  it('renders exactly six alignment actions in GroupSettings', () => {
    expect(groupSettingsSource).toContain('class="group-alignment-actions"')
    expect(groupSettingsSource).toContain('v-for="option in groupAlignOptions"')
    expect(groupSettingsSource).toContain('@click="handleGroupAlign(option.type)"')
    expect(groupSettingsSource.match(/labelKey: 'editor\.align/g)).toHaveLength(6)
    expect(groupSettingsSource).toContain('class="group-alignment-item"')
    expect(groupSettingsSource).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))')
    expect(groupSettingsSource).toContain('.group-alignment-button:nth-child(4)')
    expect(groupSettingsSource).toContain(':focus-visible')
    expect(groupSettingsSource).not.toContain('grid-template-columns: repeat(6, 28px)')
  })

  it('does not render alignment actions in the bottom editor bar', () => {
    expect(bottomBarSource).not.toContain('quick-align-cell')
    expect(bottomBarSource).not.toContain('quickAlignOptions')
    expect(bottomBarSource).not.toContain('handleQuickAlign')
  })
})

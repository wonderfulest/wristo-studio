import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('./LayoutGroupSettings.vue', import.meta.url), 'utf8')
const groupSettingsSource = readFileSync(new URL('./GroupSettings.vue', import.meta.url), 'utf8')
const propertiesPanelSource = readFileSync(new URL('../../properties/PropertiesPanel.vue', import.meta.url), 'utf8')

describe('LayoutGroupSettings binding UI contract', () => {
  it('renders reusable binding controls for the whole layout group', () => {
    expect(source).toContain('<GroupSettings')
    expect(source).toContain('binding-only')
    expect(source).toContain('@binding-change="updateGroupBinding"')
  })

  it('shows override state and supports restoring all members', () => {
    expect(source).toContain('overriddenElementIds')
    expect(source).toContain('@click="restoreGroupBinding"')
    expect(source).toContain("t('layoutGroup.restoreBinding')")
  })

  it('provides a binding editor for each member', () => {
    expect(source).toContain('@click="toggleMemberBinding(member.elementId)"')
    expect(source).toContain('@binding-change="updateMemberBinding(member.elementId, $event)"')
  })

  it('exposes binding-only mode and a restore method from GroupSettings', () => {
    expect(groupSettingsSource).toContain('bindingOnly?: boolean')
    expect(groupSettingsSource).toContain("(e: 'bindingChange'")
    expect(groupSettingsSource).toContain('defineExpose({ applyCurrentBinding })')
  })

  it('does not render the goal selector when the design has no goal properties', () => {
    expect(groupSettingsSource).toContain('const hasGoalProperties = computed')
    expect(groupSettingsSource).toContain('&& hasGoalProperties.value')
  })

  it('refreshes bound layout-group metric content after a data or goal property is edited', () => {
    expect(propertiesPanelSource).toContain('syncMetricPropertyBindings(propertyPayload.key, propertyPayload.type)')
  })
})

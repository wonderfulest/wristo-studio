import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyGroupAlignment } from './groupAlignment'

const groupSettingsSource = readFileSync(
  new URL('./GroupSettings.vue', import.meta.url),
  'utf8',
)
const bottomBarSource = readFileSync(
  new URL('../../dialogs/EditorSettingsDialog.vue', import.meta.url),
  'utf8',
)

describe('multi-selection alignment placement', () => {
  it.each(['left', 'center', 'right'] as const)(
    'updates every element originX before applying %s alignment',
    (alignment) => {
      const calls: string[] = []
      const elements = [
        { id: 'data-1', set: (key: string, value: string) => calls.push(`set:data-1:${key}:${value}`) },
        { id: 'unit-1', set: (key: string, value: string) => calls.push(`set:unit-1:${key}:${value}`) },
      ]

      applyGroupAlignment(
        elements as any,
        alignment,
        (type) => calls.push(`align:${type}`),
        (id, patch) => calls.push(`patch:${id}:originX:${patch.originX}`),
      )

      expect(calls).toEqual([
        `set:data-1:originX:${alignment}`,
        `patch:data-1:originX:${alignment}`,
        `set:unit-1:originX:${alignment}`,
        `patch:unit-1:originX:${alignment}`,
        `align:${alignment}`,
      ])
    },
  )

  it('keeps vertical group alignment from changing element originX', () => {
    const calls: string[] = []
    const elements = [
      { id: 'data-1', set: () => calls.push('set') },
      { id: 'unit-1', set: () => calls.push('set') },
    ]

    applyGroupAlignment(
      elements as any,
      'top',
      (type) => calls.push(`align:${type}`),
      () => calls.push('patch'),
    )

    expect(calls).toEqual(['align:top'])
  })

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

  it('uses the Align actions as the only group alignment control', () => {
    expect(groupSettingsSource).not.toContain('<AlignXButtons')
    expect(groupSettingsSource).not.toContain("t('elementSettings.alignment')")
    expect(groupSettingsSource).not.toContain('originXOptions')
    expect(groupSettingsSource).not.toContain('updateOriginX')
  })

  it('does not render alignment actions in the bottom editor bar', () => {
    expect(bottomBarSource).not.toContain('quick-align-cell')
    expect(bottomBarSource).not.toContain('quickAlignOptions')
    expect(bottomBarSource).not.toContain('handleQuickAlign')
  })
})

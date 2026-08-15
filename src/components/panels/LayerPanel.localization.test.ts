// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { translate } from '@/i18n'

const source = readFileSync(`${process.cwd()}/src/components/panels/LayerPanel.vue`, 'utf8')

describe('LayerPanel localization', () => {
  it('renders display states and layer types through i18n', () => {
    expect(source).toContain("t('layer.active')")
    expect(source).toContain("t('layer.ambient')")
    expect(source).toContain('getLayerDisplayName(item.layer)')
    expect(source).toContain('getLayerDisplayName(layer)')
    expect(source).toContain('resolveLayerName(layer.layerName, getLayerTypeLabel(layer.eleType))')
  })

  it('provides Simplified Chinese labels for the requested layer panel items', () => {
    expect(translate('layer.active', 'zh')).toBe('亮屏')
    expect(translate('layer.ambient', 'zh')).toBe('息屏')
    expect(translate('addElement.type.background', 'zh')).toBe('背景')
  })
})

// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { translate } from '@/i18n'

const source = readFileSync(`${process.cwd()}/src/components/panels/AddElementPanel.vue`, 'utf8')
const appMenuSource = readFileSync(`${process.cwd()}/src/components/layout/AppMenu.vue`, 'utf8')

describe('AddElementPanel metric property assignment', () => {
  it('assigns mode-compatible Dial Properties to subDial elements', () => {
    expect(source).toContain("elementType === 'subDial'")
    expect(source).toContain('createQuickDialProperty(mode)')
  })

  it('assigns an available Dial Property from the top app menu', () => {
    expect(appMenuSource).toContain("resolvedElementType === 'subDial'")
    expect(appMenuSource).toContain('getOrCreateAvailableDialProperty(mode)')
    expect(appMenuSource).toContain('dialProperty: binding.key')
  })
})

describe('AddElementPanel localization', () => {
  it('renders category and element labels through i18n', () => {
    expect(source).toContain("t(`addElement.category.${categoryKey}`)")
    expect(source).toContain("t(`addElement.type.${type}`)")
  })

  it('provides Simplified Chinese labels for every category and element type', () => {
    expect(translate('addElement.category.decoration', 'zh')).toBe('装饰')
    expect(translate('addElement.category.metric', 'zh')).toBe('指标')
    expect(translate('addElement.category.texts', 'zh')).toBe('文本')
    expect(translate('addElement.type.background', 'zh')).toBe('背景')
    expect(translate('addElement.type.zoneMetric', 'zh')).toBe('区间指标')
    expect(translate('addElement.type.angledText', 'zh')).toBe('倾斜文本')
    expect(translate('addElement.type.arcSunEvents', 'zh')).toBe('弧形日出日落')
  })
})

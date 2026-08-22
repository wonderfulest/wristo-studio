// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { translate } from '@/i18n'

const source = readFileSync(`${process.cwd()}/src/components/panels/AddElementPanel.vue`, 'utf8')
const appMenuSource = readFileSync(`${process.cwd()}/src/components/layout/AppMenu.vue`, 'utf8')
const dataFieldMenuSource = readFileSync(`${process.cwd()}/src/components/layout/app-menu/AppMenuDataFieldGroup.vue`, 'utf8')
const imagePanelSource = readFileSync(`${process.cwd()}/src/elements/decoration/image/image.panel.vue`, 'utf8')
describe('AddElementPanel metric property assignment', () => {
  it('binds standalone unit elements to a canonical metric property', () => {
    expect(source).toContain("['data', 'icon', 'label', 'unit', 'zoneMetric'].includes(elementType)")
  })

  it('assigns compatible Dial Properties to repeatable rotating hand elements', () => {
    expect(source).toContain("elementType === 'rotatingHand'")
    expect(source).toContain('createQuickDialProperty(mode)')
    expect(appMenuSource).toContain("resolvedElementType === 'rotatingHand'")
    expect(appMenuSource).toContain('getOrCreateAvailableDialProperty(mode)')
    expect(source).toContain("progressMode === 'direction'")
    expect(appMenuSource).toContain("config.progressMode === 'direction'")
  })

  it('creates and binds a shared Date Property for each new date element', () => {
    expect(source).toContain('createQuickDateProperty')
    expect(source).toContain('normalizedRecord.dateProperty')
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
    expect(translate('addElement.type.rotatingHand', 'zh')).toBe('旋转指针')
    expect(translate('addElement.type.timeHands', 'zh')).toBe('时间指针组')
  })

  it('opens the Time Hands group dialog instead of persisting a composite element', () => {
    expect(source).toContain('TimeHandsDialog')
    expect(source).toContain("elementType === 'timeHands'")
    expect(source).toContain('addTimeHandsGroup')
    expect(source).toContain("historyStore.runAtomicMutation('time-hands:add'")
    expect(source).not.toContain("getElementHandler('timeHands'")
  })
})

describe('Mask image shortcut', () => {
  it('reuses the image element while routing its picker to mask assets', () => {
    expect(dataFieldMenuSource).toContain("onAddElement('image', 'image', { assetType: 'mask' })")
    expect(appMenuSource).toContain("category === 'image'")
    expect(imagePanelSource).toContain(':asset-type="assetType"')
    expect(imagePanelSource).toContain("currentModel.value.assetType === 'mask' ? 'mask' : 'image'")
  })

  it('provides localized Mask labels', () => {
    expect(translate('editor.mask', 'en')).toBe('Mask')
    expect(translate('editor.mask', 'zh')).toBe('掩码')
  })

  it('shows Mask in the left element panel and routes it through the image handler', () => {
    expect(source).toContain('panelElementConfigs')
    expect(source).toContain("assetType: 'mask'")
    expect(source).toContain("elementType === 'mask' ? 'image' : elementType")
    expect(translate('addElement.type.mask', 'en')).toBe('Mask')
    expect(translate('addElement.type.mask', 'zh')).toBe('掩码')
  })
})

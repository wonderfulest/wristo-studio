// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import BackgroundPanel from './background.panel.vue'
const state = vi.hoisted(() => ({ base: { id: 'design-a', appId: 0 }, theme: { config: { defaultThemeId: 'theme-a' }, updateAsset: vi.fn() }, exists: true }))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => state.base }))
vi.mock('@/stores/visualThemeStore', () => ({ useVisualThemeStore: () => state.theme }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ getElementConfig: () => state.exists ? {} : null }) }))
vi.mock('@/engine/managers/elementManager', () => ({ updateElement: vi.fn() }))
vi.mock('@/stores/common', () => ({ IMAGE_ASPECT_CODE: { BACKGROUND: 'background' } }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/common/ImageUpload.vue', () => ({ default: { props: ['completeUpload'], template: '<div />' } }))
vi.mock('@/components/color-picker/index.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/panels/settings/ThemeRuleSettings.vue', () => ({ default: { template: '<div />' } }))
const setup = () => {
  const applyPatch = vi.fn().mockResolvedValue(undefined)
  const panel = mount(BackgroundPanel, { props: { config: { id: 'background-a' }, applyPatch } })
  const complete = (panel.vm as any).completeUpload
  return { panel, complete, applyPatch }
}
beforeEach(() => { state.base.id = 'design-a'; state.exists = true; state.theme.config.defaultThemeId = 'theme-a'; vi.clearAllMocks() })
it('applies to the original background and theme after the panel is removed', async () => {
  const { panel, complete, applyPatch } = setup()
  panel.unmount()
  state.theme.config.defaultThemeId = 'theme-b'
  await complete({ id: 123, url: 'new.png' })
  expect(applyPatch).toHaveBeenCalledWith({ imageId: 123, imageUrl: 'new.png' })
  expect(state.theme.updateAsset).toHaveBeenCalledWith('theme-a', 'background', { assetId: 123, imageUrl: 'new.png' })
})
it.each(['different-design', 'deleted-element'])('does not overwrite %s', async reason => {
  const { panel, complete, applyPatch } = setup()
  panel.unmount()
  if (reason === 'different-design') state.base.id = 'design-b'
  else state.exists = false
  await complete({ id: 123, url: 'new.png' })
  expect(applyPatch).not.toHaveBeenCalled()
  expect(state.theme.updateAsset).not.toHaveBeenCalled()
})

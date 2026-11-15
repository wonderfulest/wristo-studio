// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useFontStore } from '@/stores/fontStore'
import BitmapFontPreview from '@/features/bitmap-font-preview/BitmapFontPreview.vue'
import Preview from './IconGlyphPreview.vue'
beforeEach(() => { setActivePinia(createPinia()) })
it('renders the font atlas glyph instead of displaying its ASCII character', async () => {
  useFontStore().serverFonts.set('default-icons', { bitmapPreviewDescriptorUrl: '/icons.fnt', bitmapPreviewAtlasUrl: '/icons.png' } as any)
  const wrapper = shallowMount(Preview, { props: { fontSlug: 'default-icons', unicode: '0067' } })
  expect(wrapper.findComponent(BitmapFontPreview).props()).toMatchObject({ descriptorUrl: '/icons.fnt', atlasUrl: '/icons.png', codepoints: [103] })
  expect(wrapper.text()).not.toContain('g')
  await wrapper.setProps({ unicode: '0068' })
  expect(wrapper.findComponent(BitmapFontPreview).props('codepoints')).toEqual([104])
})
it('does not substitute letters when preview resources are unavailable', () => {
  useFontStore().serverFonts.set('no-preview', { slug: 'no-preview' } as any)
  const wrapper = shallowMount(Preview, { props: { fontSlug: 'no-preview', unicode: '0067' } })
  expect(wrapper.text()).toBe('—')
})

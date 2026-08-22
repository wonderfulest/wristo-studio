// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import FontFamilyList from './FontFamilyList.vue'
import type { FontItem } from '@/types/font-picker'

vi.mock('@/components/fonts/FontListItem.vue', () => ({
  default: {
    props: ['label', 'previewTextStyle', 'fontId', 'fontSlug', 'ownerUserId', 'type', 'bitmapPreviewDescriptorUrl', 'bitmapPreviewAtlasUrl'],
    template: '<div class="font-main" :data-font-id="fontId" :data-font-slug-prop="fontSlug" :data-owner-user-id="ownerUserId" :data-type="type" :data-preview-fnt="bitmapPreviewDescriptorUrl" :data-preview-atlas="bitmapPreviewAtlasUrl"><span class="preview-text" :style="previewTextStyle">Aa</span><span class="font-label">{{ label }}</span><button class="manage-font">Manage</button></div>'
  }
}))

const fonts: FontItem[] = [
  { value: 'kode-regular', family: 'Kode Mono', label: 'Kode Mono Regular', weightClass: 400 },
  { value: 'kode-bold', family: 'Kode Mono', label: 'Kode Mono Bold', weightClass: 700 },
  {
    value: 'inter-regular',
    family: 'Inter',
    label: 'Inter Regular',
    weightClass: 400,
    bitmapRecipe: {
      schemaVersion: 1,
      rendererVersion: '1',
      fontWeight: 700,
      italicAngle: -12,
      outlineWidthEm: 0.04,
      outlineMode: 'outline-only',
      lineJoin: 'round',
      antialias: true
    }
  }
]

const mountList = (modelValue = '') =>
  mount(FontFamilyList, {
    props: { fonts, modelValue }
  })

describe('FontFamilyList', () => {
  it('collapses multi-weight families and leaves single-weight families directly selectable', () => {
    const wrapper = mountList()

    expect(wrapper.findAll('.font-family-summary')).toHaveLength(1)
    expect(wrapper.find('.font-family-summary').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.font-family-count').text()).toBe('2')
    expect(wrapper.findAll('.font-item').filter((item) => item.isVisible())).toHaveLength(1)
  })

  it('uses one collapsed family entry for matching number and text font variants', async () => {
    const wrapper = mount(FontFamilyList, {
      props: {
        fonts: [
          { value: 'clock-number', family: 'Clock Sans', label: 'Clock Sans Digits', type: 'number_font' },
          { value: 'clock-text', family: 'Clock Sans', label: 'Clock Sans Regular', type: 'text_font' },
        ],
        modelValue: '',
      },
    })

    expect(wrapper.findAll('.font-family-group')).toHaveLength(1)
    expect(wrapper.findAll('.font-family-summary')).toHaveLength(1)
    expect(wrapper.find('.font-family-summary').attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.font-item').filter((item) => item.isVisible())).toHaveLength(0)

    await wrapper.find('.font-family-summary').trigger('click')

    expect(wrapper.findAll('.font-item').filter((item) => item.isVisible())).toHaveLength(2)
  })

  it('automatically expands the selected font family', () => {
    const wrapper = mountList('kode-bold')

    expect(wrapper.find('.font-family-summary').attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('.font-item').filter((item) => item.isVisible())).toHaveLength(3)
    expect(wrapper.find('.font-item.active').text()).toContain('Kode Mono Bold')
  })

  it('toggles a family without selecting a font', async () => {
    const wrapper = mountList()

    await wrapper.find('.font-family-summary').trigger('click')

    expect(wrapper.find('.font-family-summary').attributes('aria-expanded')).toBe('true')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('emits the font when a weight is selected', async () => {
    const wrapper = mountList('kode-regular')

    await wrapper.findAll('.font-item')[1].trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual([fonts[1]])
  })

  it('forwards the original font identity needed by the quick edit button', () => {
    const wrapper = mount(FontFamilyList, {
      props: {
        fonts: [{ id: 42, userId: 7, value: 'my-clock', family: 'My Clock', label: 'My Clock', type: 'number_font' } as FontItem],
        modelValue: '',
      },
    })
    const item = wrapper.get('.font-main')

    expect(item.attributes('data-font-id')).toBe('42')
    expect(item.attributes('data-font-slug-prop')).toBe('my-clock')
    expect(item.attributes('data-owner-user-id')).toBe('7')
    expect(item.attributes('data-type')).toBe('number_font')
  })

  it('marks and styles recipe cards as a non-destructive preview', () => {
    const wrapper = mountList()
    const recipeCard = wrapper.find('[data-font-slug="inter-regular"]')
    expect(recipeCard.find('.bitmap-recipe-preview-badge').text()).toBe('Preview')
    const surface = recipeCard.find('.bitmap-recipe-preview-surface')
    expect((surface.element as HTMLElement).style.fontWeight).toBe('')
    const preview = recipeCard.find('.preview-text')
    expect((surface.element as HTMLElement).style.transform).toBe('')
    expect((preview.element as HTMLElement).style.transform).toBe('skewX(-12deg)')
    expect((preview.element as HTMLElement).style.fontWeight).toBe('700')
    expect(getComputedStyle(recipeCard.find('.font-label').element).transform).toBe('')
    expect(getComputedStyle(recipeCard.find('.font-label').element).fontWeight).not.toBe('var(--bitmap-preview-weight)')
    expect(getComputedStyle(recipeCard.find('.manage-font').element).transform).toBe('')
    expect((preview.element as HTMLElement).style.getPropertyValue('--bitmap-preview-stroke')).toBe('1px currentColor')
    expect((preview.element as HTMLElement).style.getPropertyValue('--bitmap-preview-fill')).toBe('transparent')
    expect(wrapper.find('[data-font-slug="kode-regular"] .bitmap-recipe-preview-badge').exists()).toBe(false)
  })

  it.each([
    ['fill-outline', 12, 'currentColor', '1px currentColor'],
    ['fill', 0, 'currentColor', '0'],
  ] as const)('styles %s mode and italic angle on the inner preview surface', (outlineMode, angle, fill, stroke) => {
    const font = { ...fonts[2], value: `mode-${outlineMode}`, family: `Mode ${outlineMode}`, bitmapRecipe: {
      ...(fonts[2].bitmapRecipe as any), outlineMode, italicAngle: angle,
    } } as FontItem
    const wrapper = mount(FontFamilyList, { props: { fonts: [font], modelValue: '' } })
    const surface = wrapper.find('.bitmap-recipe-preview-surface')
    expect((surface.element as HTMLElement).style.transform).toBe('')
    const preview = wrapper.find('.preview-text').element as HTMLElement
    expect(preview.style.transform).toBe(`skewX(${angle}deg)`)
    expect(preview.style.getPropertyValue('--bitmap-preview-fill')).toBe(fill)
    expect(preview.style.getPropertyValue('--bitmap-preview-stroke')).toBe(stroke)
  })

  it('forwards published BMFont assets without applying the recipe scale a second time', () => {
    const wrapper = mount(FontFamilyList, {
      props: {
        fonts: [{
          value: 'icons-compact',
          family: 'Icons Compact',
          label: 'Icons Compact',
          type: 'icon_font',
          bitmapRecipe: {
            schemaVersion: 1,
            rendererVersion: '1',
            contentScale: 0.72,
            antialias: true,
          },
          bitmapPreviewDescriptorUrl: '/preview/icons.fnt',
          bitmapPreviewAtlasUrl: '/preview/icons.png',
        } as FontItem],
        modelValue: '',
      },
    })

    const card = wrapper.get('[data-font-slug="icons-compact"]')
    expect(card.attributes('data-bitmap-recipe-preview')).toBeUndefined()
    expect(card.find('.bitmap-recipe-preview-badge').exists()).toBe(false)
    expect((card.get('.preview-text').element as HTMLElement).style.transform).toBe('')
    expect(card.get('.font-main').attributes('data-preview-fnt')).toBe('/preview/icons.fnt')
    expect(card.get('.font-main').attributes('data-preview-atlas')).toBe('/preview/icons.png')
  })
})

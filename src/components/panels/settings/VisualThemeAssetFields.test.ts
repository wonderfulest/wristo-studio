// @vitest-environment jsdom
import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { VisualTheme } from '@/types/visualTheme'
import CenterCapGeometrySettings from '@/elements/dials/centerCap/CenterCapGeometrySettings.vue'
import VisualThemeAssetFields from './VisualThemeAssetFields.vue'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const theme: VisualTheme = {
  id: 'day',
  name: 'Day',
  assets: { centerCap: { assetId: 2, imageUrl: 'old.svg', targetSize: 18 } },
}

describe('VisualThemeAssetFields', () => {
  it('edits inherited cap geometry without losing the base asset', () => {
    const wrapper = shallowMount(VisualThemeAssetFields, {
      props: { theme: { ...theme, assets: {} }, baseCenterCap: { assetId: 7, imageUrl: 'base.svg', left: 227, top: 180, targetSize: 30 } },
      global: { stubs: { ElButton: true } },
    })
    const geometry = wrapper.findComponent(CenterCapGeometrySettings)
    expect(geometry.props('model')).toMatchObject({ left: 227, top: 180 })
    geometry.vm.$emit('update', { left: 0 })
    expect(wrapper.emitted('updateAsset')?.[0]).toEqual(['centerCap', { assetId: 7, imageUrl: 'base.svg', left: 0 }])
  })

  it('maps picker selections to durable asset references at the component boundary', () => {
    const wrapper = shallowMount(VisualThemeAssetFields, {
      props: { theme },
      global: { stubs: { ElButton: true } },
    })
    const pickers = wrapper.findAllComponents({ name: 'AssetPicker' })
    const centerCap = pickers.find((picker) => picker.props('assetType') === 'center_cap')

    centerCap!.props('onSelect')('preview.png', {
      id: 42,
      file: { url: 'https://cdn.example/cap.svg', previewUrl: 'https://cdn.example/cap.png' },
    })

    expect(wrapper.emitted('updateAsset')?.[0]).toEqual([
      'centerCap',
      { assetId: 42, imageUrl: 'https://cdn.example/cap.svg', targetSize: 18 },
    ])
  })

  it('emits null when an assigned asset is cleared', async () => {
    const wrapper = shallowMount(VisualThemeAssetFields, {
      props: { theme },
      global: {
        stubs: {
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.find('[data-clear-slot="centerCap"]').trigger('click')
    expect(wrapper.emitted('updateAsset')?.[0]).toEqual(['centerCap', null])
  })

  it('omits unavailable slots and explains that themes only override base layers', () => {
    const wrapper = shallowMount(VisualThemeAssetFields, {
      props: { theme, availableSlots: ['hourHand', 'minuteHand'] },
      global: { stubs: { ElButton: true } },
    })

    expect(wrapper.findAllComponents({ name: 'AssetPicker' })).toHaveLength(2)
    expect(wrapper.text()).toContain('visualTheme.unavailableAssetHint')
  })
})

// @vitest-environment jsdom
import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { VisualTheme } from '@/types/visualTheme'
import VisualThemeAssetFields from './VisualThemeAssetFields.vue'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const theme: VisualTheme = {
  id: 'day',
  name: 'Day',
  assets: { centerCap: { assetId: 2, imageUrl: 'old.svg', targetSize: 18 } },
  colors: {},
  fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
}

describe('VisualThemeAssetFields', () => {
  it('maps picker selections to durable asset references at the component boundary', () => {
    const wrapper = shallowMount(VisualThemeAssetFields, { props: { theme } })
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
})

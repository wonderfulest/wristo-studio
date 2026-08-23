// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FabricText } from 'fabric'
import { applyCurrentElementPreviewFont } from '@/composables/useGarminSystemFont'
import { applyFabricCustomProperties } from '@/utils/fabricProps'

describe('Fabric font identity serialization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    applyFabricCustomProperties()
  })

  it('keeps the selected slug in history JSON while rendering the Chinese preview fallback', () => {
    const element: any = new FabricText('七月十一', {
      fontFamily: 'old-font',
      fontSize: 24,
      fill: '#fff',
    })

    applyCurrentElementPreviewFont(element, {
      fontFamily: 'new-chinese-bitmap-font',
      fontSize: 24,
      fill: '#fff',
    }, element.text)

    expect(element.fontFamily).toBe('noto-sans-sc-regular')
    expect(element.toObject()).toMatchObject({
      fontFamily: 'noto-sans-sc-regular',
      assetFontFamily: 'new-chinese-bitmap-font',
    })
  })
})

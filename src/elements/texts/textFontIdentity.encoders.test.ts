// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { applyCurrentElementPreviewFont } from '@/composables/useGarminSystemFont'
import { encodeText } from '@/elements/texts/text/text.encoder'
import { encodeAngledText } from '@/elements/texts/angledText/angledText.encoder'
import { encodeRadialText } from '@/elements/texts/radialText/radialText.encoder'
import { encodeScrollableText } from '@/elements/texts/scrollableText/scrollableText.encoder'

const textElement = () => ({
  id: 'text-1',
  eleType: 'text',
  left: 10,
  top: 20,
  originX: 'center',
  originY: 'center',
  fill: '#fff',
  fontFamily: 'old-font',
  fontSize: 24,
  text: '七月十一',
  textTemplate: '七月十一',
  set(key: string | Record<string, unknown>, value?: unknown) {
    if (typeof key === 'string') (this as any)[key] = value
    else Object.assign(this, key)
  },
}) as any

describe('text encoder font identity', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each([
    ['text', encodeText],
    ['angled text', encodeAngledText],
    ['radial text', encodeRadialText],
    ['scrollable text', encodeScrollableText],
  ] as const)('%s persists the selected slug instead of its Chinese preview fallback', (_kind, encode) => {
    const element = textElement()
    applyCurrentElementPreviewFont(element, {
      fontFamily: 'new-chinese-bitmap-font',
      fontSize: 24,
      fill: '#fff',
    }, element.text)

    expect(element.fontFamily).toBe('noto-sans-sc-regular')
    expect(encode(element).fontFamily).toBe('new-chinese-bitmap-font')
  })
})

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useScrollableTextStore } from '@/elements/texts/scrollableText/scrollableTextElement'
import ScrollableTextSettings from '@/elements/texts/scrollableText/scrollableTextSettings.vue'
import type { TextElementConfig } from '@/types/elements'

export default function registerScrollableTextPlugin() {
  registerElement('scrollableText' as ElementType, {
    add: (_type, config) => {
      const store = useScrollableTextStore()
      return store.addElement(config as any)
    },
    update: (element, patch) => {
      const store = useScrollableTextStore()
      const anyEl = element as any
      const cfg = patch as Partial<TextElementConfig> & {
        scrollAreaWidth?: number
        scrollAreaLeft?: number
        scrollAreaTop?: number
        scrollAreaBackground?: string
      }
      if (cfg.left != null) anyEl.set('left', cfg.left)
      if (cfg.top != null) anyEl.set('top', cfg.top)
      if (cfg.fontSize != null) anyEl.set('fontSize', cfg.fontSize)
      if (cfg.fill != null) anyEl.set('fill', cfg.fill)
      if (cfg.fontFamily != null) anyEl.set('fontFamily', cfg.fontFamily)
      if (cfg.scrollAreaWidth != null) anyEl.scrollAreaWidth = cfg.scrollAreaWidth
      if (cfg.scrollAreaLeft != null) anyEl.scrollAreaLeft = cfg.scrollAreaLeft
      if (cfg.scrollAreaTop != null) anyEl.scrollAreaTop = cfg.scrollAreaTop
      if (cfg.scrollAreaBackground != null) anyEl.scrollAreaBackground = cfg.scrollAreaBackground
      if (cfg.textProperty != null) anyEl.textProperty = cfg.textProperty
      if (cfg.textTemplate != null) anyEl.textTemplate = cfg.textTemplate
      anyEl.setCoords?.()
      store.baseStore.canvas?.renderAll()
    },
    encode: (element) => {
      const store = useScrollableTextStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useScrollableTextStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('scrollableText' as ElementType, ScrollableTextSettings)
}

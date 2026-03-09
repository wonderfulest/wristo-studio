import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useTextStore } from '@/elements/texts/text/textElement'
import TextSettings from '@/elements/texts/text/textSettings.vue'
import type { TextElementConfig } from '@/types/elements'

export default function registerTextPlugin() {
  registerElement('text' as ElementType, {
    add: (config) => {
      const store = useTextStore()
      return store.addElement(config as TextElementConfig)
    },
    update: (element, patch) => {
      const store = useTextStore()
      // 目前 textStore 没有专门的 update 方法，先直接在这里简单设置，再触发 render
      const anyEl = element as any
      const cfg = patch as Partial<TextElementConfig>
      if (cfg.left != null) anyEl.set('left', cfg.left)
      if (cfg.top != null) anyEl.set('top', cfg.top)
      if (cfg.fontSize != null) anyEl.set('fontSize', cfg.fontSize)
      if (cfg.fill != null) anyEl.set('fill', cfg.fill)
      if (cfg.fontFamily != null) anyEl.set('fontFamily', cfg.fontFamily)
      if (cfg.originX != null) anyEl.set('originX', cfg.originX)
      if (cfg.textProperty != null) anyEl.textProperty = cfg.textProperty
      if (cfg.textTemplate != null) anyEl.textTemplate = cfg.textTemplate
      anyEl.setCoords?.()
      store.baseStore.canvas?.renderAll()
    },
    encode: (element) => {
      const store = useTextStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useTextStore()
      return store.decodeConfig(config as TextElementConfig)
    },
  })

  registerSettings('text' as ElementType, TextSettings)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useAngledTextStore } from '@/elements/texts/angledText/angledTextElement'
import AngledTextSettings from '@/elements/texts/angledText/angledTextSettings.vue'
import type { TextElementConfig } from '@/types/elements'

export default function registerAngledTextPlugin() {
  registerElement('angledText' as ElementType, {
    add: (_type, config) => {
      const store = useAngledTextStore()
      // angledText addElement currently takes its own TextOptions; cast for now
      return store.addElement(config as any)
    },
    update: (element, patch) => {
      const anyEl = element as any
      const cfg = patch as Partial<TextElementConfig> & { angle?: number; textTemplate?: string }
      if (cfg.left != null) anyEl.set('left', cfg.left)
      if (cfg.top != null) anyEl.set('top', cfg.top)
      if (cfg.fontSize != null) anyEl.set('fontSize', cfg.fontSize)
      if (cfg.fill != null) anyEl.set('fill', cfg.fill)
      if (cfg.fontFamily != null) anyEl.set('fontFamily', cfg.fontFamily)
      if (cfg.originX != null) anyEl.set('originX', cfg.originX)
      if (cfg.textTemplate != null) anyEl.set('text', cfg.textTemplate)
      if ((cfg as any).angle != null) anyEl.set('angle', (cfg as any).angle)
      anyEl.setCoords?.()
      anyEl.canvas?.renderAll()
    },
    encode: (element) => {
      const store = useAngledTextStore()
      return store.encodeConfig(element as any) as any
    },
    decode: (config) => {
      const store = useAngledTextStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('angledText' as ElementType, AngledTextSettings)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import { useRadialTextStore } from '@/elements/texts/radialText/radialTextElement'
import RadialTextSettings from '@/elements/texts/radialText/radialTextSettings.vue'
import type { TextElementConfig } from '@/types/elements'

export default function registerRadialTextPlugin() {
  registerElement('radialText' as ElementType, {
    add: (config) => {
      const store = useRadialTextStore()
      return store.addElement(config as any)
    },
    update: (element, patch) => {
      const anyEl = element as any
      const cfg = patch as Partial<TextElementConfig> & {
        angle?: number
        radius?: number
        direction?: string
        justification?: string
      }
      if (cfg.left != null) anyEl.set('left', cfg.left)
      if (cfg.top != null) anyEl.set('top', cfg.top)
      if (cfg.fontSize != null) anyEl.set('fontSize', cfg.fontSize)
      if (cfg.fill != null) anyEl.set('fill', cfg.fill)
      if (cfg.fontFamily != null) anyEl.set('fontFamily', cfg.fontFamily)
      if ((cfg as any).angle != null) anyEl.startAngle = (cfg as any).angle
      if ((cfg as any).radius != null) anyEl.radius = (cfg as any).radius
      if ((cfg as any).direction != null) anyEl.direction = (cfg as any).direction
      if ((cfg as any).justification != null) anyEl.justification = (cfg as any).justification
      if (typeof anyEl.updateRadialLayout === 'function') {
        anyEl.updateRadialLayout()
      } else {
        anyEl.setCoords?.()
      }
      anyEl.canvas?.renderAll()
    },
    encode: (element) => {
      const store = useRadialTextStore()
      return store.encodeConfig(element as any)
    },
    decode: (config) => {
      const store = useRadialTextStore()
      return store.decodeConfig(config as any)
    },
  })

  registerSettings('radialText' as ElementType, RadialTextSettings)
}

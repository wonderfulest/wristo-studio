import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { MoveBarElementConfig } from '@/types/elements/status'
import { createMoveBar, updateMoveBar } from '@/elements/status/movebar/movebar.renderer'
import { encodeMoveBar, decodeMoveBar } from '@/elements/status/movebar/movebar.encoder'
import MoveBarSettings from '@/elements/status/movebar/movebar.panel.vue'
import { useElementDataStore } from '@/stores/elementDataStore'

export default function registerMoveBarPlugin() {
  registerElement('moveBar' as ElementType, {
    add: (config) => {
      const element = createMoveBar(config as MoveBarElementConfig)

      try {
        const fullConfig = encodeMoveBar(element as any)
        const elementDataStore = useElementDataStore()
        elementDataStore.upsertElement(fullConfig as any)
      } catch (e) {
        console.warn('[moveBar.plugin] failed to encode & upsert element config after add', e)
      }

      return element
    },
    update: (element, patch) => {
      updateMoveBar(element as any, patch as Partial<MoveBarElementConfig>)
    },
    encode: (element) => {
      return encodeMoveBar(element as any) as any
    },
    decode: (config) => {
      return decodeMoveBar(config as MoveBarElementConfig) as any
    },
  })

  registerSettings('moveBar' as ElementType, MoveBarSettings)
}

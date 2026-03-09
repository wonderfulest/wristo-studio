import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import RomansSettings from '@/elements/dials/romans/romansSettings.vue'
import type { DialElementConfig } from '@/elements/dials/romans/romans.encoder'
import { createRomans, updateRomans } from '@/elements/dials/romans/romans.renderer'
import { encodeRomans, decodeRomans } from '@/elements/dials/romans/romans.encoder'

export default function registerRomansPlugin() {
  registerElement('romans' as ElementType, {
    add: (config) => {
      return createRomans(config as unknown as DialElementConfig) as any
    },
    update: (element, patch) => {
      return updateRomans(element as any, patch as any)
    },
    encode: (element) => {
      return encodeRomans(element as any) as any
    },
    decode: (config) => {
      return decodeRomans(config as any) as any
    },
  })

  registerSettings('romans' as ElementType, RomansSettings)
}

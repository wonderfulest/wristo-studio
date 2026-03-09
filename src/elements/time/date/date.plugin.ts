import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { DateElementConfig } from '@/types/elements'
import { createDate, updateDate } from '@/elements/time/date/date.renderer'
import { encodeDate, decodeDate } from '@/elements/time/date/date.encoder'
import DatePanel from '@/elements/time/date/date.panel.vue'

export default function registerDatePlugin() {
  registerElement('date' as ElementType, {
    // renderer
    add: (config) => {
      return createDate(config as DateElementConfig)
    },
    update: (element, patch) => {
      updateDate(element as any, patch as DateElementConfig)
    },
    // encoder
    encode: (element) => {
      return encodeDate(element as any) as any
    },
    decode: (config) => {
      return decodeDate(config as DateElementConfig) as any
    },
  })

  registerSettings('date' as ElementType, DatePanel)
}

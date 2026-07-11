import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { TimeElementConfig } from '@/types/elements'
import { createTime, updateTime } from '@/elements/time/time/time.renderer'
import { encodeTime, decodeTime } from '@/elements/time/time/time.encoder'
import TimePanel from '@/elements/time/time/time.panel.vue'

export default function registerTimePlugin() {
  registerElement('time' as ElementType, {
    add: (config, renderContext) => {
      return createTime(config as TimeElementConfig, renderContext)
    },
    update: (element, patch) => {
      return updateTime(element as any, patch as TimeElementConfig)
    },
    encode: (element) => {
      return encodeTime(element as any) as any
    },
    decode: (config) => {
      return decodeTime(config as TimeElementConfig) as any
    },
  })

  registerSettings('time' as ElementType, TimePanel)
}

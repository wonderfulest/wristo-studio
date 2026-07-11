import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementConfig, ElementType } from '@/types/element'
import ImagePanel from '@/elements/decoration/image/image.panel.vue'
import type { ImageElementConfig } from '@/types/elements/image'
import { createImage, updateImage } from '@/elements/decoration/image/image.renderer'
import { encodeImage, decodeImage } from '@/elements/decoration/image/image.encoder'

export default function registerImagePlugin() {
  registerElement('image' as ElementType, {
    add: (config, renderContext) => {
      return createImage(config as unknown as ImageElementConfig, renderContext) as Promise<any>
    },
    update: (element, patch) => {
      return updateImage(element as any, patch as Partial<ImageElementConfig>)
    },
    encode: (element) => {
      return encodeImage(element as any) as unknown as ElementConfig
    },
    decode: (config) => {
      return decodeImage(config as any)
    },
  })

  registerSettings('image' as ElementType, ImagePanel)
}

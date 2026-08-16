import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import DynamicImagePanel from './dynamicImage.panel.vue'
import { createDynamicImage, updateDynamicImage } from './dynamicImage.renderer'
import { decodeDynamicImage, encodeDynamicImage } from './dynamicImage.encoder'

export default function registerDynamicImagePlugin() {
  registerElement('dynamicImage', { add: (config, context) => createDynamicImage(config as any, context), update: updateDynamicImage as any, encode: encodeDynamicImage, decode: (config) => decodeDynamicImage(config as any) })
  registerSettings('dynamicImage', DynamicImagePanel)
}

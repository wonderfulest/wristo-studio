import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { RotatingHandElementConfig } from '@/types/elements'
import { createRotatingHand, updateRotatingHand } from './rotatingHand.renderer'
import { decodeRotatingHand, encodeRotatingHand } from './rotatingHand.encoder'
import RotatingHandPanel from './rotatingHand.panel.vue'

export default function registerRotatingHandPlugin(): void {
  registerElement('rotatingHand', {
    add: (config, renderContext) => createRotatingHand(config as RotatingHandElementConfig, renderContext),
    update: (element, patch, context) => updateRotatingHand(
      element,
      patch as Partial<RotatingHandElementConfig>,
      context,
    ),
    encode: element => encodeRotatingHand(element),
    decode: config => decodeRotatingHand(config as RotatingHandElementConfig),
  })
  registerSettings('rotatingHand', RotatingHandPanel)
}

import { registerElement } from '@/engine/registry/elementRegistry'
import { registerSettings } from '@/engine/registry/settingsRegistry'
import type { ElementType } from '@/types/element'
import type { GridLinesElementConfig } from '@/types/elements'
import { createGridLines, updateGridLines } from './gridLines.renderer'
import { decodeGridLines, encodeGridLines } from './gridLines.encoder'
import GridLinesPanel from './gridLines.panel.vue'

export default function registerGridLinesPlugin(): void {
  registerElement('gridLines' as ElementType, {
    add: (config) => createGridLines(config as GridLinesElementConfig),
    update: (element, patch, context) => updateGridLines(
      element,
      patch as Partial<GridLinesElementConfig>,
      context,
    ),
    encode: (element) => encodeGridLines(element) as any,
    decode: (config) => decodeGridLines(config as GridLinesElementConfig) as any,
  })
  registerSettings('gridLines' as ElementType, GridLinesPanel)
}

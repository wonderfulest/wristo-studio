import { registerEncoder, registerDecoder, registerAddElement } from '../registry'
import type { EncoderFn, DecoderFn, AddElementFn } from '../registry'
import { useLineElementStore } from '@/stores/elements/shapes/lineElement'
import type { FabricElement } from '@/types/element'
import type { LineElementConfig } from '@/types/elements'

const encodeLine: EncoderFn<'line'> = (element: FabricElement) => {
  const store = useLineElementStore()
  return store.encodeConfig(element) as LineElementConfig
}

const decodeLine: DecoderFn<'line'> = (config: LineElementConfig) => {
  const store = useLineElementStore()
  return store.decodeConfig(config)
}

const addElement: AddElementFn<'line'> = (_elementType, config: LineElementConfig) => {
  const store = useLineElementStore()
  const options = {
    stroke: config.stroke,
    strokeWidth: Number(config.strokeWidth),
    opacity: Number(config.opacity ?? 1),
    x1: Number(config.x1),
    y1: Number(config.y1),
    x2: Number(config.x2),
    y2: Number(config.y2),
  }
  return store.addElement(options as any) as unknown as FabricElement
}

export default () => {
  registerEncoder('line', encodeLine)
  registerDecoder('line', decodeLine)
  registerAddElement('line', addElement)
}
